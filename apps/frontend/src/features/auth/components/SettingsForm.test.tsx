import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { SettingsForm } from "@/features/auth/components/SettingsForm"
import { authClient } from "@/features/auth/lib/auth-client"

vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: { updateUser: vi.fn() } }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const user: SessionUser = {
  id: "1",
  email: "a@b.cz",
  name: "Ada",
  username: "ada",
  bio: "hi",
  defaultMood: "sad",
}

const updateUser = vi.mocked(authClient.updateUser)
const onDiscard = vi.fn()

beforeEach(() => {
  updateUser.mockReset()
  onDiscard.mockReset()
  updateUser.mockResolvedValue({ data: {}, error: null })
})

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SettingsForm
        user={user}
        onDiscard={onDiscard}
      />
    </QueryClientProvider>,
  )
}

describe("SettingsForm", () => {
  it("starts with the saved profile", () => {
    renderForm()

    expect(screen.getByLabelText("Username")).toHaveValue("ada")
    expect(screen.getByLabelText("Display name")).toHaveValue("Ada")
    expect(screen.getByLabelText("Bio (optional)")).toHaveValue("hi")
    expect(screen.getByRole("radio", { name: "Sad" })).toBeChecked()
  })

  it("rejects an invalid username without calling the server", async () => {
    renderForm()

    const field = screen.getByLabelText("Username")
    await userEvent.clear(field)
    await userEvent.type(field, "a b")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Use only letters, numbers, dots and underscores")).toBeVisible()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("shows a taken username next to the field and keeps what was typed", async () => {
    updateUser.mockResolvedValue({
      data: null,
      error: { code: "USERNAME_IS_ALREADY_TAKEN", message: "taken" },
    })
    renderForm()

    const field = screen.getByLabelText("Username")
    await userEvent.clear(field)
    await userEvent.type(field, "grace")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("That username is already taken")).toBeVisible()
    expect(field).toHaveValue("grace")
  })

  it("sends only the username when it changed", async () => {
    renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(updateUser).toHaveBeenCalled())
    expect(updateUser.mock.calls[0]?.[0]).toEqual({
      name: "Ada",
      username: undefined,
      bio: "hi",
      defaultMood: "sad",
    })
  })

  it("discards edits back to the saved values", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("Display name"), "!!")
    await userEvent.click(screen.getByRole("radio", { name: "Happy" }))
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))

    expect(screen.getByLabelText("Display name")).toHaveValue("Ada")
    expect(screen.getByRole("radio", { name: "Sad" })).toBeChecked()
    expect(onDiscard).toHaveBeenCalledOnce()
    expect(updateUser).not.toHaveBeenCalled()
  })
})
