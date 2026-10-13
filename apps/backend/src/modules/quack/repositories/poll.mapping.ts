import { Prisma } from '@/generated/prisma/client';
import { Poll } from '@/modules/quack/domain/quack';

// What to load alongside a quack to build its poll as one viewer sees it.
// Counts are always derived from the vote rows, never stored, so they cannot
// drift from the votes themselves.
export type PollRelations = {
  pollOptions: {
    orderBy: { position: 'asc' };
    select: { id: true; text: true; _count: { select: { votes: true } } };
  };
  pollVotes: { where: { userId: string }; select: { optionId: true } };
};

export const pollRelations = (viewerId: string): PollRelations => ({
  pollOptions: {
    orderBy: { position: 'asc' },
    select: { id: true, text: true, _count: { select: { votes: true } } },
  },
  pollVotes: { where: { userId: viewerId }, select: { optionId: true } },
});

type PollRows = Prisma.QuackGetPayload<{ select: PollRelations }>;

export const mapPollRowsToDomain = ({
  pollOptions,
  pollVotes,
}: PollRows): Poll | null => {
  if (pollOptions.length === 0) {
    return null;
  }
  const options = pollOptions.map((option) => ({
    id: option.id,
    text: option.text,
    votes: option._count.votes,
  }));
  return {
    options,
    totalVotes: options.reduce((total, option) => total + option.votes, 0),
    myOptionId: pollVotes[0]?.optionId ?? null,
  };
};
