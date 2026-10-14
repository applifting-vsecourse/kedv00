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

  describe("poll", () => {
    const answerInputs = () => screen.queryAllByLabelText(/^Answer \d$/)

    it("starts with two answers when turned on", async () => {
      renderForm()
      expect(answerInputs()).toHaveLength(0)

      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))

      expect(answerInputs()).toHaveLength(2)
      expect(screen.getByLabelText("Answer 1")).toHaveFocus()
      expect(screen.queryByRole("button", { name: /Remove answer/ })).not.toBeInTheDocument()
    })

    it("allows up to four answers and removing down to two", async () => {
      renderForm()
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))

      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))

      expect(answerInputs()).toHaveLength(4)
      expect(screen.queryByRole("button", { name: "Add answer" })).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Remove answer 4" }))
      await userEvent.click(screen.getByRole("button", { name: "Remove answer 3" }))

      expect(answerInputs()).toHaveLength(2)
      expect(screen.queryByRole("button", { name: /Remove answer/ })).not.toBeInTheDocument()
    })

    it("posts the trimmed answers in order with the question", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), " Pizza ")
      await userEvent.type(screen.getByLabelText("Answer 2"), "Thai")
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      await waitFor(() =>
        expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({
          text: "Lunch?",
          poll: { options: ["Pizza", "Thai"] },
        }),
      )
    })

    it("explains an empty answer next to the field", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pizza")
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      expect(await screen.findByText("Write an answer or remove it")).toBeInTheDocument()
      expect(screen.getByLabelText("Answer 2")).toHaveAttribute("aria-invalid", "true")
      expect(addQuack).not.toHaveBeenCalled()
    })

    it("rejects answers that differ only in case", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pizza")
      await userEvent.type(screen.getByLabelText("Answer 2"), "pizza")
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      expect(await screen.findByText("This answer is already in the poll")).toBeInTheDocument()
      expect(screen.getByLabelText("Answer 2")).toHaveAttribute("aria-invalid", "true")
      expect(addQuack).not.toHaveBeenCalled()
    })

    it("rejects an answer over 80 characters", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pizza")
      await userEvent.click(screen.getByLabelText("Answer 2"))
      await userEvent.paste("a".repeat(81))
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      expect(await screen.findByText("Keep it under 80 characters")).toBeInTheDocument()
      expect(addQuack).not.toHaveBeenCalled()
    })

    it("posts a plain quack after the poll is turned off again", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "hello")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pizza")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      expect(answerInputs()).toHaveLength(0)
      await waitFor(() => expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({ text: "hello" }))
    })
  })
})
