import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"

import { SettingsForm } from "@/features/auth/components/SettingsForm"
import { useSession } from "@/features/auth/hooks/useSession"

export const Route = createFileRoute("/_ProtectedPages/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = useSession()
  const router = useRouter()
  const canGoBack = useCanGoBack()

  // Discarding behaves like a back button; with no history (page opened
  // directly) it goes to the feed instead of leaving the app.
  const handleDiscard = () => {
    if (canGoBack) router.history.back()
    else void router.navigate({ to: ROUTES.quacks })
  }

  return (
    <>
      <Seo title="Settings" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>
        {user ? (
          <SettingsForm
            user={user}
            onDiscard={handleDiscard}
          />
        ) : null}
      </section>
    </>
  )
}
