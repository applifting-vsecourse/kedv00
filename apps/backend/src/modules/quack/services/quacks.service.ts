import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    viewer: Identity,
    filter: { search?: string; onlyMine?: boolean } = {},
  ): Promise<Quack[]> {
    // the viewer decides which answer is marked as their own in each poll,
    // and whose quacks "mine" means
    return this.quackRepository.getQuacks(viewer.id, {
      search: filter.search,
      authorId: filter.onlyMine ? viewer.id : undefined,
    });
  }

  async createQuack(
    user: Identity,
    quackData: {
      text: string;
      mood?: QuackMood | null;
      pollOptions?: string[];
    },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood ?? null,
      pollOptions: quackData.pollOptions,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }

  async deleteQuack(user: Identity, quackId: string): Promise<void> {
    // the author is the session user, so nobody can delete someone else's quack
    if (await this.quackRepository.deleteQuackOfAuthor(quackId, user.id)) {
      return;
    }
    if (await this.quackRepository.quackExists(quackId)) {
      throw new ForbiddenException('You can only delete your own quacks');
    }
    throw new NotFoundException('Quack not found');
  }
}
