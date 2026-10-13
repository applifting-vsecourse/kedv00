import { Ban } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { moodOptions, NO_MOOD } from "@/lib/moods"

type MoodPickerProps = {
  value: string
  onChange: (value: string) => void
  isDisabled?: boolean
}

export function MoodPicker({ value, onChange, isDisabled }: MoodPickerProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Mood"
      // Radix defaults to a roving tabindex (one tab stop, arrow keys inside);
      // here every option is its own tab stop.
      rovingFocus={false}
      value={value}
      // Clicking the selected button reports an empty value;
      // ignore it so one option always stays selected.
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
      disabled={isDisabled}
    >
      <ToggleGroupItem
        value={NO_MOOD}
        aria-label="No mood"
        title="No mood"
        className="cursor-pointer"
      >
        <Ban />
      </ToggleGroupItem>
      {moodOptions.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
          title={option.label}
          className="cursor-pointer"
        >
          <option.icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
