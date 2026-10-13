import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { MoodPicker } from "@/components/MoodPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NO_MOOD } from "@/lib/moods"
import { cn } from "@/lib/utils"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { UpdateProfileError, useUpdateProfile } from "@/features/auth/hooks/useUpdateProfile"

// These mirror the server-side rules (BetterAuth's username plugin and the
// profile hook) so the user is told before the request is made.
const USERNAME_MIN = 3
const USERNAME_MAX = 30
const BIO_MAX = 160

const USERNAME_ERRORS: Record<string, string> = {
  USERNAME_IS_ALREADY_TAKEN: "That username is already taken",
  USERNAME_TOO_SHORT: `Use at least ${USERNAME_MIN} characters`,
  USERNAME_TOO_LONG: `Use at most ${USERNAME_MAX} characters`,
  INVALID_USERNAME: "Use only letters, numbers, dots and underscores",
}

const schema = z.object({
  name: z.string().trim().min(1, "Display name is required"),
  username: z
    .string()
    .trim()
    .min(USERNAME_MIN, `Use at least ${USERNAME_MIN} characters`)
    .max(USERNAME_MAX, `Use at most ${USERNAME_MAX} characters`)
    .regex(/^[A-Za-z0-9_.]+$/, "Use only letters, numbers, dots and underscores"),
  bio: z.string().max(BIO_MAX, `Keep it under ${BIO_MAX} characters`),
  defaultMood: z.enum([NO_MOOD, "happy", "sad", "angry", "silly"]),
})

type FormValues = z.infer<typeof schema>

const toFormValues = (user: SessionUser): FormValues => ({
  name: user.name,
  username: user.username,
  bio: user.bio,
  defaultMood: user.defaultMood ?? NO_MOOD,
})

type SettingsFormProps = {
  user: SessionUser
  // Called after the edits are thrown away, so the page can leave like a back button.
  onDiscard: () => void
}

export function SettingsForm({ user, onDiscard }: SettingsFormProps) {
  const updateProfile = useUpdateProfile()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(user),
  })

  const bio = useWatch({ control: form.control, name: "bio" })
  const bioLength = bio?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    const username = values.username.trim()
    updateProfile.mutate(
      {
        name: values.name.trim(),
        username: username === user.username ? undefined : username,
        bio: values.bio.trim(),
        defaultMood: values.defaultMood,
      },
      {
        onSuccess: () => {
          // Make the saved values the baseline that "Discard" returns to.
          form.reset({
            ...values,
            name: values.name.trim(),
            username: username.toLowerCase(),
            bio: values.bio.trim(),
          })
          toast.success("Settings saved")
        },
        onError: (error) => {
          const code = error instanceof UpdateProfileError ? error.code : undefined
          const usernameMessage = code ? USERNAME_ERRORS[code] : undefined
          // The typed value stays in the field; only the message is attached.
          if (usernameMessage) form.setError("username", { message: usernameMessage })
        },
      },
    )
  }

  // Errors that belong to the username field are shown there, not up here.
  const formError =
    updateProfile.error &&
    !(
      updateProfile.error instanceof UpdateProfileError &&
      updateProfile.error.code &&
      updateProfile.error.code in USERNAME_ERRORS
    )
      ? updateProfile.error.message
      : null

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  disabled={updateProfile.isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {USERNAME_MIN}–{USERNAME_MAX} characters: letters, numbers, dots and underscores.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  disabled={updateProfile.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  disabled={updateProfile.isPending}
                  {...field}
                />
              </FormControl>
              <div className="flex items-start justify-between gap-3">
                <FormMessage />
                <span
                  className={cn(
                    "ml-auto text-sm",
                    bioLength > BIO_MAX ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {bioLength}/{BIO_MAX}
                </span>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultMood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default mood for new quacks</FormLabel>
              <FormControl>
                <MoodPicker
                  value={field.value}
                  onChange={field.onChange}
                  isDisabled={updateProfile.isPending}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={updateProfile.isPending}
            onClick={() => {
              updateProfile.reset()
              form.reset(toFormValues(user))
              onDiscard()
            }}
          >
            Discard changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
