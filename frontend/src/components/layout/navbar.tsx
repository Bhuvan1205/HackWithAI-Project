"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, PanelLeftClose, PanelLeft, Activity } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export function Navbar() {
  const router = useRouter()
  const { sidebarOpen, toggleSidebar, backendStatus } = useAppStore()
  const [searchValue, setSearchValue] = React.useState("")

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim()) {
      router.push(`/dataset?search=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  return (
    <div className="sticky top-0 z-30 flex h-20 w-full items-center justify-between px-6 shrink-0 transition-all">
      <div className="flex items-center gap-6 flex-1 bg-[var(--bg-secondary)]/40 backdrop-blur-xl border border-white/10 rounded-2xl h-14 px-4 shadow-2xl">
        <button
          onClick={toggleSidebar}
          className="text-[var(--text-secondary)] transition-all hover:text-[var(--accent-color)] hover:scale-110 active:scale-95"
        >
          {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
        </button>

        <div className="hidden flex-1 md:flex max-w-xl">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] transition-colors group-focus-within:text-[var(--accent-color)]" />
            <input
              type="search"
              placeholder="Search Intelligence Database..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-black/20 border border-white/5 focus:border-[var(--accent-color)]/30 rounded-xl pl-10 pr-12 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-4 focus:ring-[var(--accent-color)]/5 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 pointer-events-none">
              <span className="text-[10px] font-bold text-[var(--text-secondary)]">⌘</span>
              <span className="text-[10px] font-bold text-[var(--text-secondary)]">K</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 ml-auto">
          <div className="relative cursor-pointer group">
            <Bell size={20} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-[#FF3B30] rounded-full border-2 border-[var(--bg-secondary)] shadow-[0_0_8px_#FF3B30]" />
          </div>

          <div className="h-6 w-[1px] bg-white/10" />

          <ThemeToggle />

          {/* User Identity */}
          <div className="flex items-center gap-3 pl-2 group cursor-pointer">
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-[var(--text-primary)] tracking-tight group-hover:text-[var(--accent-color)] transition-colors uppercase">Clearance L3</span>
              <span className="text-[9px] font-bold text-[#34C759] uppercase tracking-widest flex items-center gap-1">
                <Activity size={8} /> Sync Standard
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[var(--accent-color)] to-blue-600 p-[1px] shadow-lg group-hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all">
              <div className="h-full w-full rounded-xl bg-[var(--bg-primary)] flex items-center justify-center font-black text-xs text-white">
                GOV
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
