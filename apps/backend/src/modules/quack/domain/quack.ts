export const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export type QuackMood = (typeof QUACK_MOODS)[number];

export const QUACK_SEARCH_MIN_LENGTH = 2;
export const QUACK_SEARCH_MAX_LENGTH = 100;

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 4;
export const POLL_OPTION_MAX_LENGTH = 80;

export type PollOption = {
  id: string;
  text: string;
  votes: number;
};

export type Poll = {
  // in the order the asker entered them
  options: PollOption[];
  totalVotes: number;
  // the viewer's own pick, or null when they haven't voted
  myOptionId: string | null;
};

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export type Quack = {
  id: string;
  text: string;
  mood: QuackMood | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  // null for a plain quack
  poll: Poll | null;
};
