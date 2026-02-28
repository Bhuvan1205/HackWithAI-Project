"use client"

import * as React from "react"
import { Sidebar } from "./sidebar"
import { Navbar } from "./navbar"

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Very subtle ambient gradient mesh behind the animation */}
      <div className="fixed inset-0 bg-mesh pointer-events-none -z-20 opacity-30" />

      <Sidebar />
      <div className="flex flex-col flex-1 relative z-10 w-full min-w-0">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
