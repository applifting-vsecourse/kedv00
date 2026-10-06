type HighlightedTextProps = {
  text: string
  highlight?: string
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Marks every case-insensitive occurrence of `highlight` in `text`. Parts are
// rendered as React text, so user content is never interpreted as HTML.
export function HighlightedText({ text, highlight }: HighlightedTextProps) {
  if (!highlight) return text

  // With a capturing group, split() puts the matches at the odd indexes.
  const parts = text.split(new RegExp(`(${escapeRegExp(highlight)})`, "giu"))

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      // The parts never reorder, so their position is a stable key.
      <mark
        key={index}
        className="bg-highlight text-highlight-foreground"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  )
}
