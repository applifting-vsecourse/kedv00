// Example component test — the pattern to copy for your own components.
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  ...overrides,
})

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("shows the mood of a quack that has one", () => {
    render(<QuackList quacks={[quack({ mood: "silly" })]} />)

    expect(screen.getByText("Silly")).toBeInTheDocument()
  })

  it("shows no mood for a quack without one", () => {
    render(<QuackList quacks={[quack({ mood: null })]} />)

    for (const label of ["Happy", "Sad", "Angry", "Silly"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it("shows how many quacks match a search", () => {
    render(
      <QuackList
        quacks={[quack({ id: "q1" }), quack({ id: "q2" })]}
        searchTerm="quack"
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent('2 quacks match "quack"')
  })

  it("uses the singular for a single match", () => {
    render(
      <QuackList
        quacks={[quack()]}
        searchTerm="quack"
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent('1 quack matches "quack"')
  })

  it("shows a search empty state instead of the feed one", () => {
    render(
      <QuackList
        quacks={[]}
        searchTerm="heron"
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent('No quacks match "heron"')
    expect(screen.queryByText(/No quacks yet/)).not.toBeInTheDocument()
  })

  it("highlights the term in the text and the author name", () => {
    const { container } = render(
      <QuackList
        quacks={[quack({ text: "A duck walks into a bar" })]}
        searchTerm="duck"
      />,
    )

    const marks = Array.from(container.querySelectorAll("mark")).map((mark) => mark.textContent)
    expect(marks).toEqual(["Duck", "duck"])

    const body = screen.getByText(
      (_, element) => element?.textContent === "A duck walks into a bar",
    )
    expect(body.querySelector("mark")).toHaveTextContent("duck")
    expect(body.querySelector("mark")).toHaveClass("bg-highlight", "text-highlight-foreground")
  })

  it("shows no count or highlight without a search", () => {
    const { container } = render(<QuackList quacks={[quack()]} />)

    expect(screen.getByRole("status")).toBeEmptyDOMElement()
    expect(container.querySelector("mark")).toBeNull()
  })

  it("shows no count while a search is failing", () => {
    render(
      <QuackList
        quacks={[]}
        searchTerm="duck"
        error={new Error("Server unreachable")}
      />,
    )

    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    render(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })
})
