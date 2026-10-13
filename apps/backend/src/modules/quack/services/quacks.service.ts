import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    viewer: Identity,
    filter: { search?: string } = {},
  ): Promise<Quack[]> {
    // the viewer decides which answer is marked as their own in each poll
    return this.quackRepository.getQuacks(viewer.id, filter);
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
}
