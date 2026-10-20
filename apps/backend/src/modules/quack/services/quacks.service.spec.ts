// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  poll: null,
  ...overrides,
});

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);
    const viewer = { id: 'u1' } as Identity;

    await expect(service.getQuacks(viewer)).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledTimes(1);
    // the viewer decides which poll answers are marked as their own
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', {
      search: undefined,
      authorId: undefined,
    });
  });

  it('passes the search term to the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);
    const viewer = { id: 'u1' } as Identity;

    await expect(
      service.getQuacks(viewer, { search: 'duck' }),
    ).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', {
      search: 'duck',
      authorId: undefined,
    });
  });

  it("limits the list to the viewer's own quacks", async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    const service = new QuacksService(repository);
    const viewer = { id: 'u1' } as Identity;

    await service.getQuacks(viewer, { search: 'duck', onlyMine: true });

    expect(repository.getQuacks).toHaveBeenCalledWith('u1', {
      search: 'duck',
      authorId: 'u1',
    });
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.createQuack(user, { text: 'hello' })).resolves.toEqual(
      created,
    );
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: null,
      userId: 'u1',
    });
  });

  it('stores the mood chosen for a quack', async () => {
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(aQuack({ mood: 'silly' }));

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await service.createQuack(user, { text: 'hello', mood: 'silly' });

    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: 'silly',
      userId: 'u1',
    });
  });

  it('creates a poll with the answers in the order given', async () => {
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(aQuack());

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await service.createQuack(user, {
      text: 'Lunch?',
      pollOptions: ['Pizza', 'Thai'],
    });

    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'Lunch?',
      mood: null,
      pollOptions: ['Pizza', 'Thai'],
      userId: 'u1',
    });
  });
});

describe('QuacksService.deleteQuack', () => {
  const user = { id: 'u1' } as Identity;

  it("deletes the quack only if it is the signed-in user's", async () => {
    const repository = mock<QuackRepository>();
    repository.deleteQuackOfAuthor.mockResolvedValue(true);

    const service = new QuacksService(repository);

    await expect(service.deleteQuack(user, 'q1')).resolves.toBeUndefined();
    // the author comes from the session, not from the caller
    expect(repository.deleteQuackOfAuthor).toHaveBeenCalledWith('q1', 'u1');
  });

  it("refuses to delete someone else's quack", async () => {
    const repository = mock<QuackRepository>();
    repository.deleteQuackOfAuthor.mockResolvedValue(false);
    repository.quackExists.mockResolvedValue(true);

    const service = new QuacksService(repository);

    await expect(service.deleteQuack(user, 'q2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('reports a quack that does not exist', async () => {
    const repository = mock<QuackRepository>();
    repository.deleteQuackOfAuthor.mockResolvedValue(false);
    repository.quackExists.mockResolvedValue(false);

    const service = new QuacksService(repository);

    await expect(service.deleteQuack(user, 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
