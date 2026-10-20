import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

/** The feed, narrowed by a search term and, with `isMine`, to the signed-in user's quacks. */
export const quacksQueryOptions = (search?: string, isMine = false) =>
  queryOptions({
    queryKey: quackKeys.list(search, isMine),
    queryFn: async () => {
      const searchParams: Record<string, string> = {}
      if (search) searchParams.q = search
      if (isMine) searchParams.author = "me"
      return quacksSchema.parse(await api.get("quacks", { searchParams }).json())
    },
  })
