import { useEffect, useEffectEvent, useId, useState } from "react"
import { Search } from "lucide-react"

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { SEARCH_DEBOUNCE_MS, SEARCH_MAX_LENGTH } from "@/features/quack/lib/search"

type QuackSearchProps = {
  /** The term currently in effect (the URL's `q`). */
  value: string
  /** Called with the trimmed input once the user stops typing. */
  onSearch: (term: string) => void
  className?: string
}

export function QuackSearch({ value, onSearch, className }: QuackSearchProps) {
  const id = useId()
  const [input, setInput] = useState(value)
  // The last term handed to onSearch, or taken over from `value`.
  const [sent, setSent] = useState(value)
  const [seenValue, setSeenValue] = useState(value)

  // `value` can change without typing — back/forward, a link to the page.
  // Show the new term then, but ignore the echo of our own onSearch: the user
  // may have kept typing while it travelled through the router.
  if (value !== seenValue) {
    setSeenValue(value)
    if (value !== sent) {
      setSent(value)
      setInput(value)
    }
  }

  const search = useEffectEvent((term: string) => {
    setSent(term)
    onSearch(term)
  })

  // Every keystroke restarts the timer; taking over a new `value` cancels it.
  useEffect(() => {
    const term = input.trim()
    if (term === sent) return
    const timer = setTimeout(() => search(term), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [input, sent])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>Search quacks</Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          type="search"
          placeholder="e.g. pond or Caffeinated Duck"
          autoComplete="off"
          maxLength={SEARCH_MAX_LENGTH}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
