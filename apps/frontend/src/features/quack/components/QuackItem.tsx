import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { HighlightedText } from "@/features/quack/components/HighlightedText"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { getMoodOption } from "@/features/quack/lib/moods"

type QuackItemProps = {
  quack: Quack
  /** Search term to mark in the text and the author name. */
  highlight?: string
}

export function QuackItem({ quack, highlight }: QuackItemProps) {
  const { name, username } = quack.user
  const mood = quack.mood ? getMoodOption(quack.mood) : undefined

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      <Avatar className="size-12">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>
            <UsersName
              name={name}
              highlight={highlight}
            />{" "}
            <UsersUserName username={username} />
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
          {mood ? (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <mood.icon className="size-3.5" />
                {mood.label}
              </span>
            </>
          ) : null}
        </div>
        <p className="text-sm break-words whitespace-pre-line">
          <HighlightedText
            text={quack.text}
            highlight={highlight}
          />
        </p>
      </div>
    </article>
  )
}
