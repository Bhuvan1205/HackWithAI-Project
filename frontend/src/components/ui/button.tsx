import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
 "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-all duration-200 active:scale-95",
 {
  variants: {
   variant: {
    default:
     "bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color)]/90 shadow-lg",
    destructive:
     "bg-[var(--intel-danger)] text-white hover:bg-[var(--intel-danger)]/90",
    outline:
     "border border-[var(--border-color)] bg-transparent hover:bg-[var(--text-primary)]/5 text-[var(--text-primary)]",
    secondary:
     "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/80",
    ghost: "hover:bg-[var(--text-primary)]/10 text-[var(--text-primary)]",
    link: "text-[var(--accent-color)] underline-offset-4 hover:underline",
    glass: "bg-[var(--text-primary)]/5 border border-[var(--border-color)] backdrop-blur-md hover:bg-[var(--text-primary)]/10 text-[var(--text-primary)] shadow-lg",
   },
   size: {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
   },
  },
  defaultVariants: {
   variant: "default",
   size: "default",
  },
 }
)

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>,
 VariantProps<typeof buttonVariants> {
 asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
   <Comp
    className={cn(buttonVariants({ variant, size, className }))}
    ref={ref}
    {...props}
   />
  )
 }
)
Button.displayName = "Button"

export { Button, buttonVariants }
