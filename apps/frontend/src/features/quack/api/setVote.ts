import { api } from "@/lib/api-client"

import { pollSchema, type Poll } from "@/features/quack/api/quackSchemas"

/** Votes for `optionId`, or takes the vote back when it is `null`. Resolves to the poll as the server now sees it. */
export async function setVote(quackId: string, optionId: string | null): Promise<Poll> {
  const path = `quacks/${encodeURIComponent(quackId)}/vote`
  const json =
    optionId === null
      ? await api.delete(path).json()
      : await api.put(path, { json: { optionId } }).json()
  return pollSchema.parse(json)
}
