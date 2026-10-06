import { describe, expect, it } from "vitest"

import { describeSearchResults, toSearchTerm } from "@/features/quack/lib/search"

describe("toSearchTerm", () => {
  it.each([
    ["empty", ""],
    ["whitespace only", "   "],
    ["one character", "d"],
    ["one character after trimming", "  d  "],
  ])("ignores a term that is %s", (_case, raw) => {
    expect(toSearchTerm(raw)).toBeUndefined()
  })

  it("searches from two characters", () => {
    expect(toSearchTerm("du")).toBe("du")
  })

  it("trims surrounding whitespace but keeps inner spaces", () => {
    expect(toSearchTerm("  bread critic  ")).toBe("bread critic")
  })

  it("caps the term at 100 characters", () => {
    expect(toSearchTerm("d".repeat(150))).toBe("d".repeat(100))
  })

  it("does not cut an emoji in half when capping", () => {
    expect(toSearchTerm(`${"d".repeat(99)}🦆`)).toBe("d".repeat(99))
  })
})

describe("describeSearchResults", () => {
  it("counts several matches", () => {
    expect(describeSearchResults(3, "duck")).toBe('3 quacks match "duck"')
  })

  it("uses the singular for one match", () => {
    expect(describeSearchResults(1, "duck")).toBe('1 quack matches "duck"')
  })

  it("says when nothing matches", () => {
    expect(describeSearchResults(0, "duck")).toBe('No quacks match "duck"')
  })
})
