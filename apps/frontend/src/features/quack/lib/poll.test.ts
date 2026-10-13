import { describe, expect, it } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { applyVote, describeVotes, votePercent } from "@/features/quack/lib/poll"

const poll = (myOptionId: string | null, votes: [number, number]): Poll => ({
  options: [
    { id: "o1", text: "Pizza", votes: votes[0] },
    { id: "o2", text: "Thai", votes: votes[1] },
  ],
  totalVotes: votes[0] + votes[1],
  myOptionId,
})

describe("applyVote", () => {
  it("adds a first vote", () => {
    expect(applyVote(poll(null, [1, 0]), "o2")).toEqual(poll("o2", [1, 1]))
  })

  it("moves an existing vote", () => {
    expect(applyVote(poll("o1", [2, 0]), "o2")).toEqual(poll("o2", [1, 1]))
  })

  it("takes a vote back", () => {
    expect(applyVote(poll("o1", [2, 1]), null)).toEqual(poll(null, [1, 1]))
  })

  it("leaves the counts alone when voting for the same answer again", () => {
    expect(applyVote(poll("o1", [2, 1]), "o1")).toEqual(poll("o1", [2, 1]))
  })
})

describe("votePercent", () => {
  it("is 0 when nobody has voted", () => {
    expect(votePercent(0, 0)).toBe(0)
  })

  it("rounds to whole numbers", () => {
    expect(votePercent(1, 3)).toBe(33)
    expect(votePercent(2, 3)).toBe(67)
  })
})

describe("describeVotes", () => {
  it.each([
    [0, "0 votes"],
    [1, "1 vote"],
    [7, "7 votes"],
  ])("describes %i", (count, text) => {
    expect(describeVotes(count)).toBe(text)
  })
})
