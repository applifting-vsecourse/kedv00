import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';
import {
  mapPollRowsToDomain,
  PollRelations,
  pollRelations,
} from './poll.mapping';

type QuackInclude = PollRelations & { user: true };

const quackInclude = (viewerId: string): QuackInclude => ({
  user: true,
  ...pollRelations(viewerId),
});

const mapPrismaQuackToDomain = (
  quack: Prisma.QuackGetPayload<{ include: QuackInclude }>,
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username ?? '',
      }
    : undefined,
  poll: mapPollRowsToDomain(quack),
});

// Prisma's `contains` compiles to ILIKE '%' || term || '%' without escaping the
// term, so `%` and `_` would act as wildcards. Backslash is Postgres's default
// LIKE escape character.
const escapeLikeWildcards = (term: string): string =>
  term.replace(/[\\%_]/g, '\\$&');

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getQuacks(
    viewerId: string,
    filter: { search?: string } = {},
  ): Promise<Quack[]> {
    const pattern = filter.search
      ? escapeLikeWildcards(filter.search)
      : undefined;
    const quacks = await this.prisma.quack.findMany({
      where: pattern
        ? {
            OR: [
              { text: { contains: pattern, mode: 'insensitive' } },
              { user: { name: { contains: pattern, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      include: quackInclude(viewerId),
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood: QuackMood | null;
    userId: string;
    // answers in display order, only for a poll
    pollOptions?: string[];
  }): Promise<Quack> {
    // The options are a nested write, so the quack and its poll are created in
    // one transaction: there is never a poll quack without its answers.
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        pollOptions: createQuackData.pollOptions && {
          create: createQuackData.pollOptions.map((text, position) => ({
            text,
            position,
          })),
        },
      },
      include: quackInclude(createQuackData.userId),
    });
    return mapPrismaQuackToDomain(quack);
  }
}
