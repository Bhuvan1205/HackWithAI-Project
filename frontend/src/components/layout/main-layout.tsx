"use client"

import * as React from "react"
import { Sidebar } from "./sidebar"
import { Navbar } from "./navbar"

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Subtle ambient gradient mesh in the background */}
      <div className="fixed inset-0 bg-mesh pointer-events-none z-0 opacity-40 mix-blend-screen" />

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
