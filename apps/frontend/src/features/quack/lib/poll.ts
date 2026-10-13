import type { Poll } from "@/features/quack/api/quackSchemas"

// Mirror the server-side DTO so the form reports problems before posting —
// the server still validates independently.
export const POLL_MIN_OPTIONS = 2
export const POLL_MAX_OPTIONS = 4
export const POLL_OPTION_MAX_LENGTH = 80

/** The poll as it will be once the viewer's vote moves to `optionId` (or is taken back, for `null`). */
export function applyVote(poll: Poll, optionId: string | null): Poll {
  const options = poll.options.map((option) => {
    let votes = option.votes
    if (option.id === poll.myOptionId) votes -= 1
    if (option.id === optionId) votes += 1
    return { ...option, votes: Math.max(votes, 0) }
  })
  return {
    options,
    totalVotes: options.reduce((total, option) => total + option.votes, 0),
    myOptionId: optionId,
  }
}

/** Whole-number share of the votes; may not add up to exactly 100 across options. */
export function votePercent(votes: number, totalVotes: number): number {
  return totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100)
}

export function describeVotes(count: number): string {
  return `${count} ${count === 1 ? "vote" : "votes"}`
}
