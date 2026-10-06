import type { QuackMood } from "@/features/quack/api/quackSchemas"

// Display metadata for each mood. The emoji is decoration — the label carries
// the meaning, so screen readers never depend on the glyph.
export const moodOptions: { value: QuackMood; label: string; emoji: string }[] = [
  { value: "happy", label: "Happy", emoji: "😄" },
  { value: "sad", label: "Sad", emoji: "😢" },
  { value: "angry", label: "Angry", emoji: "😠" },
  { value: "silly", label: "Silly", emoji: "🤪" },
]

export const getMoodOption = (mood: QuackMood) =>
  moodOptions.find((option) => option.value === mood)
