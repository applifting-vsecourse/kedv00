import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HighlightedText } from "@/features/quack/components/HighlightedText"

const marks = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("mark")).map((mark) => mark.textContent)

describe("HighlightedText", () => {
  it("renders plain text without a term", () => {
    const { container } = render(<HighlightedText text="Duck pond" />)

    expect(container).toHaveTextContent("Duck pond")
    expect(marks(container)).toEqual([])
  })

  it("marks every occurrence, ignoring case and keeping the original casing", () => {
    const { container } = render(
      <HighlightedText
        text="Duck, DUCK, duckling"
        highlight="duck"
      />,
    )

    expect(container).toHaveTextContent("Duck, DUCK, duckling")
    expect(marks(container)).toEqual(["Duck", "DUCK", "duck"])
  })

  it("treats regex characters in the term literally", () => {
    const { container } = render(
      <HighlightedText
        text="100% (sure) a.b axb"
        highlight="a.b"
      />,
    )

    expect(marks(container)).toEqual(["a.b"])
  })

  it("marks wildcard characters literally", () => {
    const { container } = render(
      <HighlightedText
        text="snake_case and 100%"
        highlight="_c"
      />,
    )

    expect(marks(container)).toEqual(["_c"])
  })

  it("never renders the text as HTML", () => {
    const { container } = render(
      <HighlightedText
        text="<b>bold</b> duck"
        highlight="duck"
      />,
    )

    expect(container.querySelector("b")).toBeNull()
    expect(container).toHaveTextContent("<b>bold</b> duck")
  })
})
