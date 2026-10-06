import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"
import { Separator } from "@/components/ui/separator"

import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { toSearchTerm } from "@/features/quack/lib/search"

const quacksSearchParamsSchema = z.object({
  // The router JSON-parses search values, so a hand-typed `?q=123` arrives as
  // a number. Anything that isn't a plain value is dropped.
  q: z.union([z.string(), z.number(), z.boolean()]).transform(String).optional().catch(undefined),
})

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  component: QuacksPage,
  validateSearch: quacksSearchParamsSchema,
})

function QuacksPage() {
  const { q = "" } = Route.useSearch()
  const navigate = Route.useNavigate()
  const searchTerm = toSearchTerm(q)

  const quacksQuery = useQuery({
    ...quacksQueryOptions(searchTerm),
    // Keep the current results on screen while the next search loads.
    placeholderData: keepPreviousData,
  })

  // Placeholder results belong to the previous term, so the result count and
  // highlighting keep using it until the new results arrive.
  const [shownSearchTerm, setShownSearchTerm] = useState(searchTerm)
  if (!quacksQuery.isPlaceholderData && shownSearchTerm !== searchTerm) {
    setShownSearchTerm(searchTerm)
  }

  const handleSearch = (term: string) => {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, q: term || undefined }),
      // One history entry per visit, not per search; and typing must not
      // scroll the page.
      replace: true,
      resetScroll: false,
    })
  }

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm />

        <Separator className="my-6" />

        <QuackSearch
          className="mb-4"
          value={q}
          onSearch={handleSearch}
        />

        <QuackList
          quacks={quacksQuery.data ?? []}
          isLoading={quacksQuery.isLoading}
          error={quacksQuery.error ?? undefined}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
          searchTerm={shownSearchTerm}
        />
      </section>
    </>
  )
}
