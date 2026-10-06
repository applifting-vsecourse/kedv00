import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addQuack } from "@/features/quack/api/addQuack"
import { QuackForm } from "@/features/quack/components/QuackForm"

vi.mock("@/features/quack/api/addQuack", () => ({ addQuack: vi.fn() }))

beforeEach(() => {
  vi.mocked(addQuack).mockReset()
  vi.mocked(addQuack).mockResolvedValue({} as Awaited<ReturnType<typeof addQuack>>)
})

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <QuackForm />
    </QueryClientProvider>,
  )
}

describe("QuackForm", () => {
  it("posts the chosen mood with the text", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "hello")
    await userEvent.click(screen.getByRole("radio", { name: "Silly" }))
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() =>
      expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({ text: "hello", mood: "silly" }),
    )
  })

  it("posts without a mood when none is chosen", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "hello")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({ text: "hello" }))
  })

  it("preselects no mood and always keeps one option selected", async () => {
    renderForm()

    const noMood = screen.getByRole("radio", { name: "No mood" })
    expect(noMood).toBeChecked()

    await userEvent.click(screen.getByRole("radio", { name: "Sad" }))
    expect(screen.getByRole("radio", { name: "Sad" })).toBeChecked()
    expect(noMood).not.toBeChecked()

    await userEvent.click(screen.getByRole("radio", { name: "Sad" }))
    expect(screen.getByRole("radio", { name: "Sad" })).toBeChecked()
  })
})
