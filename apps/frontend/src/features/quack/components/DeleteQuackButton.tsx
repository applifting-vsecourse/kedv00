import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

type DeleteQuackButtonProps = {
  quackId: string
  /** Set when a moderator deletes someone else's quack, so the dialog names whose it is. */
  authorUsername?: string
}

export function DeleteQuackButton({ quackId, authorUsername }: DeleteQuackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const deleteQuack = useDeleteQuack()

  const handleOpenChange = (shouldOpen: boolean) => {
    // Stay open until the request settles, so a failure has somewhere to show.
    if (deleteQuack.isPending) return
    setIsOpen(shouldOpen)
    if (!shouldOpen) deleteQuack.reset()
  }

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete quack"
          className="text-muted-foreground"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {authorUsername ? `Delete @${authorUsername}'s quack?` : "Delete this quack?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            It disappears from the feed for everyone, along with any poll votes. This can&apos;t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteQuack.error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {deleteQuack.error.message}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteQuack.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteQuack.isPending}
            onClick={(event) => {
              // The action closes the dialog by default; wait for the server instead.
              event.preventDefault()
              deleteQuack.mutate(quackId, { onSuccess: () => setIsOpen(false) })
            }}
          >
            {deleteQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
