import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useSession } from "@/features/auth/hooks/useSession"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm, type QuackFormHandle } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { toSearchTerm } from "@/features/quack/lib/search"

const FEED_TABS = ["all", "mine"] as const

const quacksSearchParamsSchema = z.object({
  // The router JSON-parses search values, so a hand-typed `?q=123` arrives as
  // a number. Anything that isn't a plain value is dropped.
  q: z.union([z.string(), z.number(), z.boolean()]).transform(String).optional().catch(undefined),
  // "all" is the default, so only "mine" ever appears in the URL.
  tab: z.literal("mine").optional().catch(undefined),
})

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  component: QuacksPage,
  validateSearch: quacksSearchParamsSchema,
})

function QuacksPage() {
  const { user } = useSession()
  const { q = "", tab = "all" } = Route.useSearch()
  const navigate = Route.useNavigate()
  const searchTerm = toSearchTerm(q)
  const isMine = tab === "mine"
  const formRef = useRef<QuackFormHandle>(null)

  const quacksQuery = useQuery({
    ...quacksQueryOptions(searchTerm, isMine),
    // Keep the current results on screen while the next search loads — but
    // only within a tab: everyone's quacks must never show up under Mine.
    placeholderData: (previous: Quack[] | undefined, previousQuery) =>
      previousQuery?.queryKey[2].mine === isMine ? previous : undefined,
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

  const handleTabChange = (value: string) => {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, tab: value === "mine" ? "mine" : undefined }),
      resetScroll: false,
    })
  }

  const list = (
    <QuackList
      quacks={quacksQuery.data ?? []}
      isLoading={quacksQuery.isLoading}
      error={quacksQuery.error ?? undefined}
      // Only the error state offers a retry — posting invalidates the list,
      // and refocusing the tab refetches it.
      onReload={() => void quacksQuery.refetch()}
      searchTerm={shownSearchTerm}
      currentUserId={user?.id}
      emptyState={
        isMine ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t quacked yet. Your quacks will show up here.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => formRef.current?.focus()}
            >
              Write your first quack
            </Button>
          </div>
        ) : undefined
      }
    />
  )

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          ref={formRef}
          defaultMood={user?.defaultMood}
        />

        <Separator className="my-6" />

        <Tabs
          value={tab}
          onValueChange={handleTabChange}
        >
          <TabsList
            aria-label="Whose quacks to show"
            className="mb-4"
          >
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
          </TabsList>

          <QuackSearch
            className="mb-4"
            value={q}
            onSearch={handleSearch}
          />

          {FEED_TABS.map((value) => (
            <TabsContent
              key={value}
              value={value}
            >
              {list}
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </>
  )
}
