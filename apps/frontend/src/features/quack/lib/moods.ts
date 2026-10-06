import { Angry, Frown, Laugh, Smile, type LucideIcon } from "lucide-react"

import type { QuackMood } from "@/features/quack/api/quackSchemas"

// Display metadata for each mood. The icon is decoration (lucide icons are
// aria-hidden) — the label carries the meaning.
export const moodOptions: { value: QuackMood; label: string; icon: LucideIcon }[] = [
  { value: "happy", label: "Happy", icon: Smile },
  { value: "sad", label: "Sad", icon: Frown },
  { value: "angry", label: "Angry", icon: Angry },
  { value: "silly", label: "Silly", icon: Laugh },
]

export const getMoodOption = (mood: QuackMood) =>
  moodOptions.find((option) => option.value === mood)
