import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"
import { describeSearchResults } from "@/features/quack/lib/search"

type QuackListProps = {
  quacks: Quack[]
  isLoading?: boolean
  error?: Error
  onReload?: () => void
  /** The term `quacks` were filtered by, if any. */
  searchTerm?: string
}

export function QuackList({ quacks, isLoading, error, onReload, searchTerm }: QuackListProps) {
  const isInitialLoad = isLoading && quacks.length === 0
  const searchStatus =
    searchTerm !== undefined && !isInitialLoad && !error
      ? describeSearchResults(quacks.length, searchTerm)
      : ""

  return (
    <div className="flex flex-col">
      {isInitialLoad ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : null}

      {error ? (
        <Alert
          variant="destructive"
          className="mb-4"
        >
          <AlertTitle>Couldn&apos;t load quacks</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error.message}</span>
            {onReload ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onReload}
              >
                <RefreshCw className="size-4" />
                Reload
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Always rendered: a live region must exist before its text changes,
          or screen readers don't announce the change. Doubles as the empty
          state of a search. */}
      <p
        role="status"
        className={cn(
          "text-sm text-muted-foreground",
          searchStatus && (quacks.length === 0 ? "py-8 text-center" : "pb-2"),
        )}
      >
        {searchStatus}
      </p>

      {searchTerm === undefined && !isLoading && !error && quacks.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No quacks yet. Post the first one.
        </p>
      ) : null}

      {quacks.map((quack) => (
        <QuackItem
          key={quack.id}
          quack={quack}
          highlight={searchTerm}
        />
      ))}
    </div>
  )
}
