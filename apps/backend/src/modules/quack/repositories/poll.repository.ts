import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { Poll } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';
import { mapPollRowsToDomain, pollRelations } from './poll.mapping';

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

@Injectable()
export class PollRepository {
  constructor(private readonly prisma: PrismaService) {}

  // null when the quack doesn't exist or isn't a poll
  async getPoll(quackId: string, viewerId: string): Promise<Poll | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: pollRelations(viewerId),
    });
    return quack ? mapPollRowsToDomain(quack) : null;
  }

  // One row per (poll, user) is the primary key, so this either casts the
  // user's vote or moves it — never adds a second one.
  async setVote(vote: {
    quackId: string;
    userId: string;
    optionId: string;
  }): Promise<void> {
    const upsert = (): Promise<unknown> =>
      this.prisma.pollVote.upsert({
        where: {
          quackId_userId: { quackId: vote.quackId, userId: vote.userId },
        },
        create: vote,
        update: { optionId: vote.optionId },
      });
    try {
      await upsert();
    } catch (error) {
      // Two requests from the same user can both see "no vote yet" if Prisma
      // doesn't run this as INSERT … ON CONFLICT. The loser hits the primary
      // key; by then the row exists, so a retry takes the update path.
      if (!isUniqueViolation(error)) {
        throw error;
      }
      await upsert();
    }
  }

  async removeVote(vote: { quackId: string; userId: string }): Promise<void> {
    // deleteMany, so removing a vote that isn't there is not an error
    await this.prisma.pollVote.deleteMany({ where: vote });
  }
}
