"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
 const { theme, setTheme } = useTheme()
 const [mounted, setMounted] = React.useState(false)

 // Avoid Hydration Mismatch
 React.useEffect(() => {
  setMounted(true)
 }, [])

 if (!mounted) {
  return (
   <Button variant="ghost" size="icon" disabled className="w-9 h-9">
    <div className="h-4 w-4 rounded-full bg-slate-500/20 animate-pulse" />
   </Button>
  )
 }

 return (
  <Button
   variant="ghost"
   size="icon"
   onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
   className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10"
  >
   {theme === "dark" ? (
    <Sun className="h-4 w-4 transition-all" />
   ) : (
    <Moon className="h-4 w-4 transition-all" />
   )}
   <span className="sr-only">Toggle theme</span>
  </Button>
 )
}
