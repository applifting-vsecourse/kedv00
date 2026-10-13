import { Check } from "lucide-react"

import { Toggle } from "@/components/ui/toggle"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { useVote } from "@/features/quack/hooks/useVote"
import { describeVotes, votePercent } from "@/features/quack/lib/poll"

type PollResultsProps = {
  quackId: string
  poll: Poll
}

export function PollResults({ quackId, poll }: PollResultsProps) {
  const vote = useVote(quackId)

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Poll answers"
        className="flex flex-col gap-2"
      >
        {poll.options.map((option) => {
          const isMine = option.id === poll.myOptionId
          const percent = votePercent(option.votes, poll.totalVotes)
          return (
            <Toggle
              key={option.id}
              variant="outline"
              pressed={isMine}
              // Pressing your own answer again takes the vote back.
              onPressedChange={(isPressed) => vote.mutate(isPressed ? option.id : null)}
              className="relative h-auto w-full justify-between overflow-hidden px-3 py-2 text-left font-normal whitespace-normal data-[state=on]:bg-transparent data-[state=on]:font-medium data-[state=on]:text-foreground"
            >
              {/* The share bar; the numbers next to it carry the same information. */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-secondary transition-[width]"
                style={{ width: `${percent}%` }}
              />
              <span className="relative flex min-w-0 items-center gap-2 break-words">
                {isMine ? <Check aria-label="Your vote" /> : null}
                {option.text}
              </span>
              <span className="relative shrink-0 text-muted-foreground tabular-nums">
                {percent}% · {describeVotes(option.votes)}
              </span>
            </Toggle>
          )
        })}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{describeVotes(poll.totalVotes)}</span>
        {vote.isError ? (
          <p
            role="alert"
            className="text-destructive"
          >
            Your vote didn&apos;t go through. Try again.
          </p>
        ) : null}
      </div>
    </div>
  )
}
