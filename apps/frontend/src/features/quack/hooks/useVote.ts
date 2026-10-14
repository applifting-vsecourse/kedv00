import { useRef } from "react"
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { setVote } from "@/features/quack/api/setVote"
import { applyVote } from "@/features/quack/lib/poll"

// The same quack can sit in several cached lists (the feed and each search),
// so every one of them is updated.
function updatePoll(queryClient: QueryClient, quackId: string, update: (poll: Poll) => Poll) {
  queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
    quacks?.map((quack) =>
      quack.id === quackId && quack.poll ? { ...quack, poll: update(quack.poll) } : quack,
    ),
  )
}

function findPoll(queryClient: QueryClient, quackId: string): Poll | undefined {
  for (const [, quacks] of queryClient.getQueriesData<Quack[]>({ queryKey: quackKeys.lists() })) {
    const poll = quacks?.find((quack) => quack.id === quackId)?.poll
    if (poll) return poll
  }
  return undefined
}

/**
 * Votes in one poll. Call `mutate(optionId)` to vote or move the vote, `mutate(null)` to take it back.
 *
 * The screen updates before the server answers. Votes for one poll are sent one
 * at a time in click order, so the last click is what the server ends up with.
 * A burst of quick clicks is settled as a whole: only the outcome of the last
 * one is shown, and if it fails the poll goes back to how it was before the burst.
 * `isError` is true when the latest vote didn't go through.
 */
export function useVote(quackId: string) {
  const queryClient = useQueryClient()
  const scopeId = `poll-vote-${quackId}`
  // The poll as it was before the current burst of clicks.
  const beforeBurst = useRef<Poll | undefined>(undefined)

  // Counts the mutation whose callback is running: it stays pending until its
  // callbacks have finished.
  const isOnlyPendingVote = () =>
    queryClient.isMutating({ predicate: (mutation) => mutation.options.scope?.id === scopeId }) ===
    1

  return useMutation({
    scope: { id: scopeId },
    mutationFn: (optionId: string | null) => setVote(quackId, optionId),
    onMutate: async (optionId) => {
      // A refetch landing now would overwrite the optimistic counts.
      await queryClient.cancelQueries({ queryKey: quackKeys.lists() })
      if (isOnlyPendingVote()) {
        beforeBurst.current = findPoll(queryClient, quackId)
      }
      updatePoll(queryClient, quackId, (poll) => applyVote(poll, optionId))
    },
    onSuccess: (poll) => {
      if (isOnlyPendingVote()) {
        updatePoll(queryClient, quackId, () => poll)
      }
    },
    onError: () => {
      const previous = beforeBurst.current
      if (isOnlyPendingVote() && previous) {
        updatePoll(queryClient, quackId, () => previous)
      }
    },
    onSettled: () => {
      // Pull in other people's votes too, once this poll has gone quiet.
      if (isOnlyPendingVote()) {
        void queryClient.invalidateQueries({ queryKey: quackKeys.lists() })
      }
    },
  })
}
