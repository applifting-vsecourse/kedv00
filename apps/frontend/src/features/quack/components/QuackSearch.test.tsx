import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { SEARCH_DEBOUNCE_MS } from "@/features/quack/lib/search"

// fireEvent rather than user-event: user-event awaits a timer that Vitest's
// fake timers never run, which hangs the test.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

const setup = (value = "") => {
  const onSearch = vi.fn()
  const view = render(
    <QuackSearch
      value={value}
      onSearch={onSearch}
    />,
  )
  const input = screen.getByLabelText("Search quacks")
  return {
    onSearch,
    input,
    type: (text: string) => fireEvent.change(input, { target: { value: text } }),
    wait: (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms)
      }),
    rerender: (nextValue: string) =>
      view.rerender(
        <QuackSearch
          value={nextValue}
          onSearch={onSearch}
        />,
      ),
  }
}

describe("QuackSearch", () => {
  it("shows a decorative search icon inside the labelled input", () => {
    const { input } = setup()

    const icon = input.closest('[data-slot="input-group"]')?.querySelector("svg")
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute("aria-hidden", "true")
  })

  it("searches once, with the trimmed term, after typing stops", () => {
    const { onSearch, type, wait } = setup()

    type(" p")
    wait(SEARCH_DEBOUNCE_MS - 1)
    type("  pond ")
    wait(SEARCH_DEBOUNCE_MS - 1)
    expect(onSearch).not.toHaveBeenCalled()

    wait(1)
    expect(onSearch).toHaveBeenCalledExactlyOnceWith("pond")
  })

  it("does not search again when only surrounding whitespace changes", () => {
    const { onSearch, type, wait } = setup("pond")

    type("pond ")
    wait(SEARCH_DEBOUNCE_MS)

    expect(onSearch).not.toHaveBeenCalled()
  })

  it("reports a cleared input so the full feed comes back", () => {
    const { onSearch, type, wait } = setup("pond")

    type("")
    wait(SEARCH_DEBOUNCE_MS)

    expect(onSearch).toHaveBeenCalledExactlyOnceWith("")
  })

  it("shows a term that arrives from outside, e.g. back/forward", () => {
    const { input, rerender } = setup("pond")

    rerender("bread")

    expect(input).toHaveValue("bread")
  })

  it("drops a pending search when a term arrives from outside", () => {
    const { onSearch, input, type, wait, rerender } = setup()

    type("pond")
    rerender("bread")
    wait(SEARCH_DEBOUNCE_MS)

    expect(input).toHaveValue("bread")
    expect(onSearch).not.toHaveBeenCalled()
  })

  it("keeps what the user typed when its own search echoes back late", () => {
    const { onSearch, input, type, wait, rerender } = setup()

    type("po")
    wait(SEARCH_DEBOUNCE_MS)
    expect(onSearch).toHaveBeenLastCalledWith("po")

    type("pond")
    rerender("po")
    expect(input).toHaveValue("pond")

    wait(SEARCH_DEBOUNCE_MS)
    expect(onSearch).toHaveBeenLastCalledWith("pond")
  })
})
