import { HighlightedText } from "@/features/quack/components/HighlightedText"

type UsersNameProps = {
  name: string
  highlight?: string
}

export function UsersName({ name, highlight }: UsersNameProps) {
  return (
    <span className="font-semibold text-foreground">
      <HighlightedText
        text={name}
        highlight={highlight}
      />
    </span>
  )
}
