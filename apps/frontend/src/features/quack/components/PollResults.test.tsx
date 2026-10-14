import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { setVote } from "@/features/quack/api/setVote"
import { PollResults } from "@/features/quack/components/PollResults"

vi.mock("@/features/quack/api/setVote", () => ({ setVote: vi.fn() }))

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  options: [
    { id: "o1", text: "Pizza", votes: 2 },
    { id: "o2", text: "Thai", votes: 1 },
    { id: "o3", text: "Salad", votes: 0 },
  ],
  totalVotes: 3,
  myOptionId: null,
  ...overrides,
})

const aQuack = (poll: Poll): Quack => ({
  id: "q1",
  text: "Lunch?",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll,
})

// What a refetch of the feed returns.
let serverPoll: Poll

// Reads the poll from the query cache, the way the feed does, so optimistic
// updates and rollbacks show up on screen.
function Feed() {
  const { data } = useQuery({
    queryKey: quackKeys.list(),
    queryFn: () => [aQuack(serverPoll)],
  })
  const poll = data?.[0]?.poll
  return poll ? (
    <PollResults
      quackId="q1"
      poll={poll}
    />
  ) : null
}

function renderPoll(poll: Poll) {
  serverPoll = poll
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  client.setQueryData(quackKeys.list(), [aQuack(poll)])
  render(
    <QueryClientProvider client={client}>
      <Feed />
    </QueryClientProvider>,
  )
}

const answer = (name: string) => screen.getByRole("button", { name: new RegExp(name) })

// A promise the test resolves or rejects by hand, to look at the screen while
// the request is still in flight.
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.mocked(setVote).mockReset()
})

describe("PollResults", () => {
  it("shows each answer with its share and count, and the total", () => {
    renderPoll(aPoll())

    expect(answer("Pizza")).toHaveTextContent("67% · 2 votes")
    expect(answer("Thai")).toHaveTextContent("33% · 1 vote")
    expect(answer("Salad")).toHaveTextContent("0% · 0 votes")
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  it("shows an unanswered poll as 0 votes", () => {
    renderPoll(
      aPoll({
        options: [
          { id: "o1", text: "Pizza", votes: 0 },
          { id: "o2", text: "Thai", votes: 0 },
        ],
        totalVotes: 0,
      }),
    )

    expect(answer("Pizza")).toHaveTextContent("0% · 0 votes")
    expect(answer("Thai")).toHaveTextContent("0% · 0 votes")
    expect(screen.getByText("0 votes")).toBeInTheDocument()
  })

  it("marks the viewer's own pick without relying on colour", () => {
    renderPoll(aPoll({ myOptionId: "o2" }))

    expect(answer("Thai")).toHaveAttribute("aria-pressed", "true")
    expect(within(answer("Thai")).getByLabelText("Your vote")).toBeInTheDocument()
    expect(answer("Pizza")).toHaveAttribute("aria-pressed", "false")
  })

  it("counts a vote on screen before the server answers", async () => {
    const request = deferred<Poll>()
    vi.mocked(setVote).mockReturnValue(request.promise)
    renderPoll(aPoll())

    await userEvent.click(answer("Salad"))

    expect(setVote).toHaveBeenCalledWith("q1", "o3")
    expect(answer("Salad")).toHaveAttribute("aria-pressed", "true")
    expect(answer("Salad")).toHaveTextContent("25% · 1 vote")
    expect(screen.getByText("4 votes")).toBeInTheDocument()
  })

  it("moves the vote to another answer", async () => {
    vi.mocked(setVote).mockReturnValue(deferred<Poll>().promise)
    renderPoll(aPoll({ myOptionId: "o1" }))

    await userEvent.click(answer("Thai"))

    expect(setVote).toHaveBeenCalledWith("q1", "o2")
    expect(answer("Pizza")).toHaveTextContent("1 vote")
    expect(answer("Thai")).toHaveTextContent("2 votes")
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  it("takes the vote back when the own answer is clicked again", async () => {
    vi.mocked(setVote).mockReturnValue(deferred<Poll>().promise)
    renderPoll(aPoll({ myOptionId: "o1" }))

    await userEvent.click(answer("Pizza"))

    expect(setVote).toHaveBeenCalledWith("q1", null)
    expect(answer("Pizza")).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("2 votes")).toBeInTheDocument()
  })

  it("goes back to how it was and says so when a vote fails", async () => {
    const request = deferred<Poll>()
    vi.mocked(setVote).mockReturnValue(request.promise)
    renderPoll(aPoll())

    await userEvent.click(answer("Salad"))
    request.reject(new Error("Network down"))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your vote didn't go through. Try again.",
    )
    expect(answer("Salad")).toHaveAttribute("aria-pressed", "false")
    expect(answer("Salad")).toHaveTextContent("0% · 0 votes")
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  it("clears the error on the next vote", async () => {
    vi.mocked(setVote).mockRejectedValueOnce(new Error("Network down"))
    vi.mocked(setVote).mockReturnValue(deferred<Poll>().promise)
    renderPoll(aPoll())

    await userEvent.click(answer("Salad"))
    await screen.findByRole("alert")
    await userEvent.click(answer("Thai"))

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("sends quick clicks one at a time, so the last click wins", async () => {
    const first = deferred<Poll>()
    const second = deferred<Poll>()
    vi.mocked(setVote).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    renderPoll(aPoll())

    await userEvent.click(answer("Salad"))
    await userEvent.click(answer("Thai"))

    // The second request waits for the first one.
    expect(setVote).toHaveBeenCalledTimes(1)
    expect(answer("Thai")).toHaveAttribute("aria-pressed", "true")

    first.resolve(aPoll({ myOptionId: "o3" }))
    await waitFor(() => expect(setVote).toHaveBeenCalledTimes(2))
    expect(setVote).toHaveBeenLastCalledWith("q1", "o2")
    // The first answer doesn't flash back on screen while the second is in flight.
    expect(answer("Thai")).toHaveAttribute("aria-pressed", "true")

    serverPoll = aPoll({
      options: [
        { id: "o1", text: "Pizza", votes: 2 },
        { id: "o2", text: "Thai", votes: 2 },
        { id: "o3", text: "Salad", votes: 0 },
      ],
      totalVotes: 4,
      myOptionId: "o2",
    })
    second.resolve(serverPoll)

    await waitFor(() => expect(answer("Thai")).toHaveTextContent("50% · 2 votes"))
    expect(answer("Salad")).toHaveTextContent("0% · 0 votes")
  })

  it("shows the counts from the server once the vote is through", async () => {
    // Someone else voted for Pizza in the meantime.
    const fromServer = aPoll({
      options: [
        { id: "o1", text: "Pizza", votes: 3 },
        { id: "o2", text: "Thai", votes: 1 },
        { id: "o3", text: "Salad", votes: 1 },
      ],
      totalVotes: 5,
      myOptionId: "o3",
    })
    vi.mocked(setVote).mockResolvedValue(fromServer)
    renderPoll(aPoll())
    serverPoll = fromServer

    await userEvent.click(answer("Salad"))

    await waitFor(() => expect(screen.getByText("5 votes")).toBeInTheDocument())
    expect(answer("Pizza")).toHaveTextContent("60% · 3 votes")
  })
})
