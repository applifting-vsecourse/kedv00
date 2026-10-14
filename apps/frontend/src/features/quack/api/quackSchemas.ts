import { z } from "zod"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

export const quackMoodSchema = z.enum(["happy", "sad", "angry", "silly"])

export const pollOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  votes: z.number().int().nonnegative(),
})

export const pollSchema = z.object({
  // in the order the asker entered them
  options: z.array(pollOptionSchema),
  totalVotes: z.number().int().nonnegative(),
  // the signed-in user's own pick, or null when they haven't voted
  myOptionId: z.string().nullable(),
})

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  mood: quackMoodSchema.nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  poll: pollSchema.nullable(),
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
export type QuackMood = z.infer<typeof quackMoodSchema>
export type Poll = z.infer<typeof pollSchema>
