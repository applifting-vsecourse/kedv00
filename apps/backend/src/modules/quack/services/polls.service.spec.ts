import { Poll } from '@/modules/quack/domain/quack';
import { PollRepository } from '@/modules/quack/repositories/poll.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { PollsService } from './polls.service';

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  options: [
    { id: 'o1', text: 'Pizza', votes: 2 },
    { id: 'o2', text: 'Thai', votes: 1 },
  ],
  totalVotes: 3,
  myOptionId: null,
  ...overrides,
});

const voter = { id: 'u1' } as Identity;

const setup = (): {
  repository: MockProxy<PollRepository>;
  service: PollsService;
} => {
  const repository = mock<PollRepository>();
  return { repository, service: new PollsService(repository) };
};

describe('PollsService.vote', () => {
  it('records the vote for the voter from the session', async () => {
    const { repository, service } = setup();
    repository.getPoll.mockResolvedValue(aPoll());

    await service.vote(voter, 'q1', 'o2');

    expect(repository.setVote).toHaveBeenCalledWith({
      quackId: 'q1',
      userId: 'u1',
      optionId: 'o2',
    });
  });

  it('returns the poll as it is after the vote', async () => {
    const { repository, service } = setup();
    const after = aPoll({ myOptionId: 'o2', totalVotes: 4 });
    repository.getPoll
      .mockResolvedValueOnce(aPoll())
      .mockResolvedValueOnce(after);

    await expect(service.vote(voter, 'q1', 'o2')).resolves.toEqual(after);
    expect(repository.getPoll).toHaveBeenLastCalledWith('q1', 'u1');
  });

  it('moves an existing vote the same way it casts a new one', async () => {
    const { repository, service } = setup();
    repository.getPoll.mockResolvedValue(aPoll({ myOptionId: 'o1' }));

    await service.vote(voter, 'q1', 'o2');

    expect(repository.setVote).toHaveBeenCalledTimes(1);
    expect(repository.setVote).toHaveBeenCalledWith({
      quackId: 'q1',
      userId: 'u1',
      optionId: 'o2',
    });
  });

  it('rejects an answer from a different poll', async () => {
    const { repository, service } = setup();
    repository.getPoll.mockResolvedValue(aPoll());

    await expect(
      service.vote(voter, 'q1', 'other-poll-option'),
    ).rejects.toThrow(BadRequestException);
    expect(repository.setVote).not.toHaveBeenCalled();
  });

  it('is not found when the quack is missing or not a poll', async () => {
    const { repository, service } = setup();
    repository.getPoll.mockResolvedValue(null);

    await expect(service.vote(voter, 'q1', 'o1')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.setVote).not.toHaveBeenCalled();
  });
});

describe('PollsService.removeVote', () => {
  it("removes only the voter's own vote and returns the fresh poll", async () => {
    const { repository, service } = setup();
    const after = aPoll({ totalVotes: 2 });
    repository.getPoll
      .mockResolvedValueOnce(aPoll({ myOptionId: 'o1' }))
      .mockResolvedValueOnce(after);

    await expect(service.removeVote(voter, 'q1')).resolves.toEqual(after);
    expect(repository.removeVote).toHaveBeenCalledWith({
      quackId: 'q1',
      userId: 'u1',
    });
  });

  it('is not found when the quack is missing or not a poll', async () => {
    const { repository, service } = setup();
    repository.getPoll.mockResolvedValue(null);

    await expect(service.removeVote(voter, 'q1')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.removeVote).not.toHaveBeenCalled();
  });
});
