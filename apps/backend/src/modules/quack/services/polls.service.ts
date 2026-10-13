import { Poll } from '@/modules/quack/domain/quack';
import { PollRepository } from '@/modules/quack/repositories/poll.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class PollsService {
  constructor(private readonly pollRepository: PollRepository) {}

  // Casts the voter's vote, or moves it if they already voted in this poll.
  // Returns the poll as it is after the vote, so the client can correct its
  // optimistic counts.
  async vote(
    voter: Identity,
    quackId: string,
    optionId: string,
  ): Promise<Poll> {
    const poll = await this.getPollOrThrow(quackId, voter);
    // Options never change after posting, so this check can't go stale.
    if (!poll.options.some((option) => option.id === optionId)) {
      throw new BadRequestException('That answer is not part of this poll');
    }
    await this.pollRepository.setVote({
      quackId,
      userId: voter.id,
      optionId,
    });
    return this.getPollOrThrow(quackId, voter);
  }

  async removeVote(voter: Identity, quackId: string): Promise<Poll> {
    await this.getPollOrThrow(quackId, voter);
    await this.pollRepository.removeVote({ quackId, userId: voter.id });
    return this.getPollOrThrow(quackId, voter);
  }

  private async getPollOrThrow(
    quackId: string,
    viewer: Identity,
  ): Promise<Poll> {
    const poll = await this.pollRepository.getPoll(quackId, viewer.id);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    return poll;
  }
}
