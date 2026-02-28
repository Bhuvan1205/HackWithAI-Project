"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"
import { MainLayout } from "@/components/layout/main-layout"

export function AuthGuard({ children }: { children: React.ReactNode }) {
 const pathname = usePathname()
 const router = useRouter()
 const { isLoggedIn, loadFromStorage } = useAuthStore()
 const [checked, setChecked] = React.useState(false)

 React.useEffect(() => {
  loadFromStorage()
  setChecked(true)
 }, [loadFromStorage])

 const PUBLIC_ROUTES = ["/login", "/theme-test"]

 React.useEffect(() => {
  if (checked && !isLoggedIn && !PUBLIC_ROUTES.includes(pathname)) {
   router.replace("/login")
  }
 }, [checked, isLoggedIn, pathname, router])

 if (!checked) {
  return (
   <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-accent animate-pulse text-sm font-mono uppercase tracking-widest">
     Initializing Console...
    </div>
   </div>
  )
 }

 // Public pages — render without sidebar/navbar (theme-test handles its own layout)
 if (PUBLIC_ROUTES.includes(pathname)) {
  return <>{children}</>
 }

 // All other pages — require auth + render with MainLayout
 if (!isLoggedIn) return null

 return <MainLayout>{children}</MainLayout>
}

