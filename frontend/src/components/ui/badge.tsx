import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-800 text-slate-100 hover:bg-slate-700 shadow-sm",
        secondary:
          "border-transparent bg-slate-800 text-slate-100 hover:bg-slate-700",
        destructive:
          "border-transparent bg-[#FF3B30]/20 text-[#FF3B30] hover:bg-[#FF3B30]/30 glow-red border-[#FF3B30]/50",
        warning:
          "border-transparent bg-[#FF9F0A]/20 text-[#FF9F0A] hover:bg-[#FF9F0A]/30 glow-amber border-[#FF9F0A]/50",
        success:
          "border-transparent bg-[#34C759]/20 text-[#34C759] hover:bg-[#34C759]/30 glow-green border-[#34C759]/50",
        outline: "text-slate-300 border-slate-700",
        highRisk: "border-[#FF3B30]/50 bg-[#FF3B30]/20 text-[#FF3B30] animate-pulse-red",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
