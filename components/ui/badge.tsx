import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-ring transition-all duration-200 overflow-hidden shadow-sm",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-premium [a&]:hover:from-primary/90 [a&]:hover:to-primary/80",
        secondary:
          "border-transparent bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-premium [a&]:hover:from-secondary/90 [a&]:hover:to-secondary/80",
        destructive:
          "border-transparent bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground shadow-premium [a&]:hover:from-destructive/90 [a&]:hover:to-destructive/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-border/60 bg-background/50 backdrop-blur-sm text-foreground [a&]:hover:bg-accent/80 [a&]:hover:text-accent-foreground",
        success:
          "border-transparent bg-gradient-to-r from-success to-success/90 text-white shadow-premium [a&]:hover:from-success/90 [a&]:hover:to-success/80",
        warning:
          "border-transparent bg-gradient-to-r from-warning to-warning/90 text-white shadow-premium [a&]:hover:from-warning/90 [a&]:hover:to-warning/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
