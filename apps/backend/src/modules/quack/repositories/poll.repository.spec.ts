// The database is mocked, so these tests pin down the queries the repository
// sends — the one-vote-per-person guarantee itself is the table's primary key.
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PollRepository } from './poll.repository';

const setup = (): {
  prisma: DeepMockProxy<PrismaService>;
  repository: PollRepository;
} => {
  const prisma = mockDeep<PrismaService>();
  return { prisma, repository: new PollRepository(prisma) };
};

const vote = { quackId: 'q1', userId: 'u1', optionId: 'o2' };

const uniqueViolation = (): Prisma.PrismaClientKnownRequestError =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

describe('PollRepository.getPoll', () => {
  it('is null when the quack does not exist', async () => {
    const { prisma, repository } = setup();
    prisma.quack.findUnique.mockResolvedValue(null);

    await expect(repository.getPoll('q1', 'u1')).resolves.toBeNull();
  });

  it('is null when the quack has no answers', async () => {
    const { prisma, repository } = setup();
    prisma.quack.findUnique.mockResolvedValue({
      pollOptions: [],
      pollVotes: [],
    } as never);

    await expect(repository.getPoll('q1', 'u1')).resolves.toBeNull();
  });
});

describe('PollRepository.setVote', () => {
  it("upserts on the voter's one row for this poll", async () => {
    const { prisma, repository } = setup();

    await repository.setVote(vote);

    expect(prisma.pollVote.upsert).toHaveBeenCalledWith({
      where: { quackId_userId: { quackId: 'q1', userId: 'u1' } },
      create: vote,
      update: { optionId: 'o2' },
    });
  });

  it('retries once when a concurrent vote inserted the row first', async () => {
    const { prisma, repository } = setup();
    prisma.pollVote.upsert
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce({} as never);

    await repository.setVote(vote);

    expect(prisma.pollVote.upsert).toHaveBeenCalledTimes(2);
  });

  it('does not swallow other errors', async () => {
    const { prisma, repository } = setup();
    prisma.pollVote.upsert.mockRejectedValue(new Error('connection lost'));

    await expect(repository.setVote(vote)).rejects.toThrow('connection lost');
    expect(prisma.pollVote.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('PollRepository.removeVote', () => {
  it("deletes only this voter's vote in this poll", async () => {
    const { prisma, repository } = setup();

    await repository.removeVote({ quackId: 'q1', userId: 'u1' });

    expect(prisma.pollVote.deleteMany).toHaveBeenCalledWith({
      where: { quackId: 'q1', userId: 'u1' },
    });
  });
});
