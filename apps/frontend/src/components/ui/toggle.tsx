import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Toggle as TogglePrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  [
    // layout
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    // text and shape
    "rounded-md text-sm font-medium",
    // hover (the outline variant overrides this with accent)
    "transition-[color,box-shadow] hover:bg-muted hover:text-muted-foreground",
    // keyboard focus ring
    "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    // selected
    "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
    // disabled
    "disabled:pointer-events-none disabled:opacity-50",
    // icons: never intercept clicks, never shrink, default to size-4
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 min-w-9 px-2",
        sm: "h-8 min-w-8 px-1.5",
        lg: "h-10 min-w-10 px-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
