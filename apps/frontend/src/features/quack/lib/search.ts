// Mirrors the server-side DTO (2–100 characters after trimming) so the client
// never sends a term the server would reject.
export const SEARCH_MIN_LENGTH = 2
export const SEARCH_MAX_LENGTH = 100

export const SEARCH_DEBOUNCE_MS = 300

/** The term to search for, or `undefined` when the input is too short to search by. */
export function toSearchTerm(raw: string): string | undefined {
  const term = raw
    .trim()
    // Only a hand-edited URL can be longer than the input allows.
    .slice(0, SEARCH_MAX_LENGTH)
    // Don't leave half of an emoji behind after cutting.
    .replace(/[\uD800-\uDBFF]$/, "")
    .trim()
  return term.length >= SEARCH_MIN_LENGTH ? term : undefined
}

export function describeSearchResults(count: number, term: string): string {
  if (count === 0) return `No quacks match "${term}"`
  return `${count} ${count === 1 ? "quack matches" : "quacks match"} "${term}"`
}
