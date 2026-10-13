import { Angry, Frown, Laugh, Smile, type LucideIcon } from "lucide-react"

export type Mood = "happy" | "sad" | "angry" | "silly"

// A toggle group cannot hold an empty value, so "no mood" gets a sentinel that
// callers translate to an omitted field before the request.
export const NO_MOOD = "none"

// Display metadata for each mood. The icon is decoration (lucide icons are
// aria-hidden) — the label carries the meaning.
export const moodOptions: { value: Mood; label: string; icon: LucideIcon }[] = [
  { value: "happy", label: "Happy", icon: Smile },
  { value: "sad", label: "Sad", icon: Frown },
  { value: "angry", label: "Angry", icon: Angry },
  { value: "silly", label: "Silly", icon: Laugh },
]

export const getMoodOption = (mood: Mood) => moodOptions.find((option) => option.value === mood)
