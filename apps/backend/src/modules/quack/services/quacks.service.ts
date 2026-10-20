import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class QuacksService {
  private readonly logger = new Logger(QuacksService.name);

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
    const authorId = await this.quackRepository.findQuackAuthorId(quackId);
    if (authorId === null) {
      throw new NotFoundException('Quack not found');
    }
    // the user and their role come from the session, never from the request
    const isOwner = authorId === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You can only delete your own quacks');
    }
    await this.quackRepository.deleteQuack(quackId);
    if (!isOwner) {
      this.logger.log(
        `Moderator ${user.id} deleted quack ${quackId} by ${authorId}`,
      );
    }
  }
}
