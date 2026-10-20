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

const VIEWER_ID = 'viewer-1';

// The poll part of every quack query: answers in order with their vote counts,
// plus the viewer's own vote.
const expectedInclude = {
  user: true,
  pollOptions: {
    orderBy: { position: 'asc' },
    select: { id: true, text: true, _count: { select: { votes: true } } },
  },
  pollVotes: { where: { userId: VIEWER_ID }, select: { optionId: true } },
};

const aPrismaQuack = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: 'q1',
  text: 'Lunch?',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'caffeinatedduck' },
  pollOptions: [],
  pollVotes: [],
  ...overrides,
});

const whereOf = (prisma: DeepMockProxy<PrismaService>): unknown =>
  prisma.quack.findMany.mock.calls[0]?.[0]?.where;

describe('QuackRepository.getQuacks', () => {
  it('lists every quack, newest first, when there is no search term', async () => {
    const { prisma, repository } = setup();

    await repository.getQuacks(VIEWER_ID);

    expect(prisma.quack.findMany).toHaveBeenCalledWith({
      where: undefined,
      include: expectedInclude,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('matches the term case-insensitively in the text or the author name', async () => {
    const { prisma, repository } = setup();

    await repository.getQuacks(VIEWER_ID, { search: 'Duck' });

    expect(prisma.quack.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { text: { contains: 'Duck', mode: 'insensitive' } },
          { user: { name: { contains: 'Duck', mode: 'insensitive' } } },
        ],
      },
      include: expectedInclude,
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

      await repository.getQuacks(VIEWER_ID, { search: term });

      expect(whereOf(prisma)).toEqual({
        OR: [
          { text: { contains: pattern, mode: 'insensitive' } },
          { user: { name: { contains: pattern, mode: 'insensitive' } } },
        ],
      });
    },
  );
  it("limits the list to one author's quacks", async () => {
    const { prisma, repository } = setup();

    await repository.getQuacks(VIEWER_ID, { authorId: 'u1' });

    expect(whereOf(prisma)).toEqual({ userId: 'u1' });
  });

  it('combines the author with the search term', async () => {
    const { prisma, repository } = setup();

    await repository.getQuacks(VIEWER_ID, { search: 'Duck', authorId: 'u1' });

    expect(whereOf(prisma)).toEqual({
      userId: 'u1',
      OR: [
        { text: { contains: 'Duck', mode: 'insensitive' } },
        { user: { name: { contains: 'Duck', mode: 'insensitive' } } },
      ],
    });
  });
});

describe('QuackRepository poll mapping', () => {
  it('maps a plain quack to poll: null', async () => {
    const { prisma, repository } = setup();
    prisma.quack.findMany.mockResolvedValue([aPrismaQuack()] as never);

    const [quack] = await repository.getQuacks(VIEWER_ID);

    expect(quack?.poll).toBeNull();
  });

  it('maps answers with their counts, the total and the viewer pick', async () => {
    const { prisma, repository } = setup();
    prisma.quack.findMany.mockResolvedValue([
      aPrismaQuack({
        pollOptions: [
          { id: 'o1', text: 'Pizza', _count: { votes: 3 } },
          { id: 'o2', text: 'Thai', _count: { votes: 0 } },
          { id: 'o3', text: 'Salad', _count: { votes: 1 } },
        ],
        pollVotes: [{ optionId: 'o3' }],
      }),
    ] as never);

    const [quack] = await repository.getQuacks(VIEWER_ID);

    expect(quack?.poll).toEqual({
      options: [
        { id: 'o1', text: 'Pizza', votes: 3 },
        { id: 'o2', text: 'Thai', votes: 0 },
        { id: 'o3', text: 'Salad', votes: 1 },
      ],
      totalVotes: 4,
      myOptionId: 'o3',
    });
  });

  it('has no pick when the viewer has not voted', async () => {
    const { prisma, repository } = setup();
    prisma.quack.findMany.mockResolvedValue([
      aPrismaQuack({
        pollOptions: [
          { id: 'o1', text: 'Pizza', _count: { votes: 0 } },
          { id: 'o2', text: 'Thai', _count: { votes: 0 } },
        ],
      }),
    ] as never);

    const [quack] = await repository.getQuacks(VIEWER_ID);

    expect(quack?.poll).toMatchObject({ totalVotes: 0, myOptionId: null });
  });
});

describe('QuackRepository.createQuack', () => {
  it('creates the answers in the order given, with the quack', async () => {
    const { prisma, repository } = setup();
    prisma.quack.create.mockResolvedValue(aPrismaQuack() as never);

    await repository.createQuack({
      text: 'Lunch?',
      mood: null,
      userId: VIEWER_ID,
      pollOptions: ['Pizza', 'Thai'],
    });

    expect(prisma.quack.create).toHaveBeenCalledWith({
      data: {
        text: 'Lunch?',
        mood: null,
        user: { connect: { id: VIEWER_ID } },
        pollOptions: {
          create: [
            { text: 'Pizza', position: 0 },
            { text: 'Thai', position: 1 },
          ],
        },
      },
      include: expectedInclude,
    });
  });

  it('creates no answers for a plain quack', async () => {
    const { prisma, repository } = setup();
    prisma.quack.create.mockResolvedValue(aPrismaQuack() as never);

    await repository.createQuack({
      text: 'hello',
      mood: null,
      userId: VIEWER_ID,
    });

    expect(prisma.quack.create.mock.calls[0]?.[0]?.data.pollOptions).toBe(
      undefined,
    );
  });
});

describe('QuackRepository.findQuackAuthorId', () => {
  it("returns the author's id", async () => {
    const { prisma, repository } = setup();
    prisma.quack.findUnique.mockResolvedValue({ userId: 'u1' } as never);

    await expect(repository.findQuackAuthorId('q1')).resolves.toBe('u1');
    expect(prisma.quack.findUnique).toHaveBeenCalledWith({
      where: { id: 'q1' },
      select: { userId: true },
    });
  });

  it('returns null for a quack that does not exist', async () => {
    const { prisma, repository } = setup();
    prisma.quack.findUnique.mockResolvedValue(null);

    await expect(repository.findQuackAuthorId('nope')).resolves.toBeNull();
  });
});

describe('QuackRepository.deleteQuack', () => {
  it('deletes the quack by id', async () => {
    const { prisma, repository } = setup();
    prisma.quack.deleteMany.mockResolvedValue({ count: 1 });

    await repository.deleteQuack('q1');

    expect(prisma.quack.deleteMany).toHaveBeenCalledWith({
      where: { id: 'q1' },
    });
  });
});
