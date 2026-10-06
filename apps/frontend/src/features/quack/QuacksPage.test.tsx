// Route-level test: the real route tree on an in-memory history, so the URL,
// the search input and the request are checked together.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import { routeTree } from "@/routeTree.gen"

vi.mock("@/config/env", () => ({
  env: { VITE_API_URL: "http://localhost/api", VITE_BETTER_AUTH_URL: "http://localhost" },
}))

vi.mock("@/lib/api-client", () => ({ api: { get: vi.fn(), post: vi.fn() } }))

vi.mock("@/features/auth/api/authSessionQueryOptions", async () => {
  const { queryOptions } = await import("@tanstack/react-query")
  return {
    authSessionQueryOptions: () =>
      queryOptions({
        queryKey: ["auth", "session"],
        queryFn: () => ({
          user: { id: "u1", email: "duck@example.com", name: "Caffeinated Duck", username: "duck" },
        }),
      }),
  }
})

const QUACKS = [
  {
    id: "q1",
    text: "The north end of the pond is closed",
    mood: null,
    userId: "u1",
    createdAt: "2026-10-01T12:00:00Z",
    user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  },
  {
    id: "q2",
    text: "Sourdough, thrown by a child",
    mood: null,
    userId: "u2",
    createdAt: "2026-09-30T12:00:00Z",
    user: { id: "u2", name: "Bread Critic", username: "BreadCritic" },
  },
]

const searchesSent = () =>
  vi
    .mocked(api.get)
    .mock.calls.map(([, options]) => (options?.searchParams as { q?: string } | undefined)?.q)

beforeEach(() => {
  // jsdom implements neither; the router scrolls and the header's theme
  // switcher queries the colour scheme.
  vi.stubGlobal("scrollTo", vi.fn())
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )

  vi.mocked(api.get).mockReset()
  // A stand-in for the server: case-insensitive match on text or author name.
  vi.mocked(api.get).mockImplementation((_url, options) => {
    const q = (options?.searchParams as { q?: string } | undefined)?.q?.toLowerCase()
    const result = q
      ? QUACKS.filter(
          (quack) =>
            quack.text.toLowerCase().includes(q) || quack.user.name.toLowerCase().includes(q),
        )
      : QUACKS
    return { json: () => Promise.resolve(result) } as unknown as ReturnType<typeof api.get>
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderAt(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
    context: { queryClient },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const searchInput = () => screen.findByLabelText("Search quacks")

// Highlighting splits a quack's text across elements; match the whole paragraph.
const quackText = (text: string) => (_content: string, element: Element | null) =>
  element?.tagName === "P" && element.textContent === text

// The status live region is always rendered, so wait for its text, not for it.
const waitForStatus = (text: string) =>
  waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(text))

describe("Quacks page search", () => {
  it("restores the search from the URL", async () => {
    renderAt("/quacks?q=pond")

    expect(await searchInput()).toHaveValue("pond")
    await waitForStatus('1 quack matches "pond"')
    expect(searchesSent()).toEqual(["pond"])
  })

  it("writes the trimmed term to the URL and fetches the matches", async () => {
    const router = renderAt("/quacks")
    await screen.findByText(quackText("Sourdough, thrown by a child"))

    await userEvent.type(await searchInput(), "  BREAD ")

    await waitFor(() => expect(router.state.location.search).toEqual({ q: "BREAD" }))
    await waitForStatus('1 quack matches "BREAD"')
    expect(
      screen.queryByText(quackText("The north end of the pond is closed")),
    ).not.toBeInTheDocument()
    expect(searchesSent()).toEqual([undefined, "BREAD"])
  })

  it("keeps the previous results, and their count, until the new ones arrive", async () => {
    renderAt("/quacks?q=pond")
    await waitForStatus('1 quack matches "pond"')

    const fetchSearch = vi.mocked(api.get).getMockImplementation()!
    const pending: { respond?: () => void } = {}
    vi.mocked(api.get).mockImplementation((url, options) => {
      const response = fetchSearch(url, options)
      return {
        json: () => new Promise((resolve) => (pending.respond = () => resolve(response.json()))),
      } as unknown as ReturnType<typeof api.get>
    })

    const input = await searchInput()
    await userEvent.clear(input)
    await userEvent.type(input, "bread")
    await waitFor(() => expect(searchesSent()).toContain("bread"))

    expect(screen.getByText(quackText("The north end of the pond is closed"))).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent('1 quack matches "pond"')

    pending.respond?.()

    expect(await screen.findByText(quackText("Sourdough, thrown by a child"))).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent('1 quack matches "bread"')
    expect(
      screen.queryByText(quackText("The north end of the pond is closed")),
    ).not.toBeInTheDocument()
  })

  it("shows the full feed for a one-character term", async () => {
    const router = renderAt("/quacks")
    await screen.findByText(quackText("Sourdough, thrown by a child"))

    await userEvent.type(await searchInput(), "b")

    await waitFor(() => expect(router.state.location.search).toEqual({ q: "b" }))
    expect(screen.getByText(quackText("The north end of the pond is closed"))).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
    expect(searchesSent()).toEqual([undefined])
  })

  it("clears the search when the term is removed from the URL", async () => {
    const router = renderAt("/quacks?q=pond")
    expect(await searchInput()).toHaveValue("pond")

    await router.navigate({ to: "/quacks" })

    await waitFor(async () => expect(await searchInput()).toHaveValue(""))
    expect(await screen.findByText(quackText("Sourdough, thrown by a child"))).toBeInTheDocument()
  })

  it("restores the term when coming back to the page", async () => {
    const router = renderAt("/quacks")
    await userEvent.type(await searchInput(), "pond")
    await waitFor(() => expect(router.state.location.search).toEqual({ q: "pond" }))

    await router.navigate({ to: "/" })
    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
    router.history.back()

    await waitFor(() => expect(router.state.location.href).toBe("/quacks?q=pond"))
    expect(await searchInput()).toHaveValue("pond")
  })
})
