"use client"

import * as React from "react"
import { Bell, Search, PanelLeftClose, PanelLeft, Activity } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { cn } from "@/lib/utils"

export function Navbar() {
  const { sidebarOpen, toggleSidebar, backendStatus } = useAppStore()

  return (
    <div className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/10 glass-panel-heavy px-4 shrink-0 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={toggleSidebar}
          className="text-slate-400 transition-colors hover:text-white"
        >
          {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
        </button>

        <div className="hidden max-w-md flex-1 md:flex">
          <div className="relative w-full group">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-accent" />
            <input
              type="search"
              placeholder="Search Claim IDs, Hospitals..."
              className="w-full bg-slate-800/50 border border-white/5 focus:border-accent/50 rounded-full pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all shadow-inner hover:bg-slate-800/80"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* System Health */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-black/20 border border-white/5">
          <Activity size={14} className={cn(
            "transition-colors",
            backendStatus === "ok" ? "text-success drop-shadow-[0_0_5px_rgba(52,199,89,0.8)]" :
              backendStatus === "degraded" ? "text-warning" :
                backendStatus === "loading" ? "text-slate-400 animate-pulse" : "text-destructive"
          )} />
          <span className="text-xs uppercase tracking-wider text-slate-300 font-medium">
            {backendStatus === 'ok' ? 'SYS. ONLINE' : backendStatus === 'degraded' ? 'DEGRADED' : backendStatus === 'loading' ? 'CONNECTING...' : 'SYS. DOWN'}
          </span>
        </div>

        {/* Notification */}
        <button className="relative text-slate-400 transition-colors hover:text-white p-2">
          <Bell size={20} />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
        </button>

        {/* Role Badge */}
        <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-accent to-blue-600 flex items-center justify-center text-xs font-bold ring-2 ring-white/10 cursor-pointer">
            GOV
          </div>
          <div className="hidden flex-col md:flex cursor-pointer group">
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">Auditor Auth</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Clearance L3</span>
          </div>
        </div>
      </div>
    </div>
  )
}
