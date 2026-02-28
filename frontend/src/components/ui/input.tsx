import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
 extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
 ({ className, type, ...props }, ref) => {
  return (
   <input
    type={type}
    className={cn(
     "flex h-10 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]/50 px-3 py-2 text-sm text-[var(--text-primary)] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] focus-visible:bg-[var(--bg-secondary)] transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-inner",
     className
    )}
    ref={ref}
    {...props}
   />
  )
 }
)
Input.displayName = "Input"

export { Input }
