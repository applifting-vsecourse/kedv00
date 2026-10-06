// The database is mocked, so these tests pin down the query the repository
// sends — not how Postgres evaluates it.
import { PrismaService } from '@/core/prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { QuackRepository } from './quack.repository';

const setup = (): {
  prisma: DeepMockProxy<PrismaService>;
  repository: QuackRepository;
} => {
  const prisma = mockDeep<PrismaService>();
  prisma.quack.findMany.mockResolvedValue([] as never);
  return { prisma, repository: new QuackRepository(prisma) };
};

const whereOf = (prisma: DeepMockProxy<PrismaService>): unknown =>
  prisma.quack.findMany.mock.calls[0]?.[0]?.where;

describe('QuackRepository.getQuacks', () => {
  it('lists every quack, newest first, when there is no search term', async () => {
    const { prisma, repository } = setup();

    await repository.getQuacks();

    expect(prisma.quack.findMany).toHaveBeenCalledWith({
      where: undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('matches the term case-insensitively in the text or the author name', async () => {
    const { prisma, repository } = setup();

    await repository.getQuacks({ search: 'Duck' });

    expect(prisma.quack.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { text: { contains: 'Duck', mode: 'insensitive' } },
          { user: { name: { contains: 'Duck', mode: 'insensitive' } } },
        ],
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it.each([
    ['100%', '100\\%'],
    ['snake_case', 'snake\\_case'],
    ['back\\slash', 'back\\\\slash'],
  ])(
    'escapes LIKE wildcards so %s is matched literally',
    async (term, pattern) => {
      const { prisma, repository } = setup();

      await repository.getQuacks({ search: term });

      expect(whereOf(prisma)).toEqual({
        OR: [
          { text: { contains: pattern, mode: 'insensitive' } },
          { user: { name: { contains: pattern, mode: 'insensitive' } } },
        ],
      });
    },
  );
});
