import { useImperativeHandle, type Ref } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ListChecks, Loader2, Plus, X } from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { MoodPicker } from "@/components/MoodPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { NO_MOOD } from "@/lib/moods"
import { cn } from "@/lib/utils"

import { quackMoodSchema, type QuackMood } from "@/features/quack/api/quackSchemas"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"
import {
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
} from "@/features/quack/lib/poll"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

const schema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
  mood: z.union([z.literal(NO_MOOD), quackMoodSchema]),
  // Empty for a plain quack. Objects rather than strings because
  // react-hook-form's field arrays need them.
  pollOptions: z
    .array(
      z.object({
        text: z
          .string()
          .trim()
          .min(1, "Write an answer or remove it")
          .max(POLL_OPTION_MAX_LENGTH, `Keep it under ${POLL_OPTION_MAX_LENGTH} characters`),
      }),
    )
    .superRefine((options, ctx) => {
      // Same rule as the server: answers may not differ only in case.
      const seen = new Set<string>()
      options.forEach((option, index) => {
        const key = option.text.toLowerCase()
        if (key && seen.has(key)) {
          ctx.addIssue({
            code: "custom",
            message: "This answer is already in the poll",
            path: [index, "text"],
          })
        }
        seen.add(key)
      })
    }),
})

type FormValues = z.infer<typeof schema>

export type QuackFormHandle = {
  /** Puts the cursor in the quack text, ready to write. */
  focus: () => void
}

type QuackFormProps = {
  ref?: Ref<QuackFormHandle>
  className?: string
  // The mood the form starts with, taken from the user's settings.
  defaultMood?: QuackMood | null
}

export function QuackForm({ ref, className, defaultMood: initialMood }: QuackFormProps) {
  const addQuack = useAddQuack()
  const defaultMood = initialMood ?? NO_MOOD
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", mood: defaultMood, pollOptions: [] },
  })
  useImperativeHandle(ref, () => ({ focus: () => form.setFocus("text") }), [form])
  const pollOptions = useFieldArray({ control: form.control, name: "pollOptions" })
  const isPoll = pollOptions.fields.length > 0

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0

  const togglePoll = (isOn: boolean) => {
    if (isOn) {
      pollOptions.append(
        Array.from({ length: POLL_MIN_OPTIONS }, () => ({ text: "" })),
        { focusIndex: 0 },
      )
    } else {
      // Turning the poll off throws its answers away.
      pollOptions.remove()
    }
  }

  const handleSubmit = (values: FormValues) => {
    addQuack.mutate(
      {
        text: values.text,
        mood: values.mood === NO_MOOD ? undefined : values.mood,
        poll:
          values.pollOptions.length > 0
            ? { options: values.pollOptions.map((option) => option.text) }
            : undefined,
      },
      { onSuccess: () => form.reset({ text: "", mood: defaultMood, pollOptions: [] }) },
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New quack</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder={isPoll ? "Where should we go for lunch?" : "Quack something..."}
                  disabled={addQuack.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isPoll ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm text-muted-foreground">
              Your quack is the question. People pick one answer.
            </legend>
            {pollOptions.fields.map((option, index) => (
              <FormField
                key={option.id}
                control={form.control}
                name={`pollOptions.${index}.text`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer {index + 1}</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          disabled={addQuack.isPending}
                          {...field}
                        />
                      </FormControl>
                      {pollOptions.fields.length > POLL_MIN_OPTIONS ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove answer ${index + 1}`}
                          disabled={addQuack.isPending}
                          onClick={() => pollOptions.remove(index)}
                        >
                          <X className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            {pollOptions.fields.length < POLL_MAX_OPTIONS ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                disabled={addQuack.isPending}
                onClick={() => pollOptions.append({ text: "" })}
              >
                <Plus className="size-4" />
                Add answer
              </Button>
            ) : null}
          </fieldset>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Mood (optional)</FormLabel>
                <FormControl>
                  <MoodPicker
                    value={field.value}
                    onChange={field.onChange}
                    isDisabled={addQuack.isPending}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex items-center gap-3">
            <Toggle
              variant="outline"
              size="sm"
              pressed={isPoll}
              onPressedChange={togglePoll}
              disabled={addQuack.isPending}
            >
              <ListChecks className="size-4" />
              Add poll
            </Toggle>
            <span
              className={cn(
                "text-sm",
                length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {length}/{MAX_LENGTH}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={addQuack.isPending}
            >
              {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Quack
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
