"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldAlert, BarChart3, Fingerprint, Database, Settings, HelpCircle, FileText } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Command Center", href: "/", icon: BarChart3 },
  { name: "Score New Claim", href: "/score", icon: FileText },
  { name: "Intelligence Alerts", href: "/alerts", icon: ShieldAlert, hasBadge: true },
  { name: "Fraud Patterns", href: "/patterns", icon: Fingerprint },
  { name: "Dataset Explorer", href: "/dataset", icon: Database },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { sidebarOpen, activeHighRiskAlert } = useAppStore()

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-white/10 glass-panel-heavy transition-all duration-300 z-40",
        sidebarOpen ? "w-64" : "w-16",
        className
      )}
    >
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-accent/20 border border-accent/50 text-accent glow-accent">
            <ShieldAlert size={18} />
          </div>
          {sidebarOpen && (
            <span className="text-sm font-bold tracking-widest text-white uppercase whitespace-nowrap">
              JAY-INTEL
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="flex flex-col gap-1 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all relative overflow-hidden",
                  isActive
                    ? "bg-white/10 text-white shadow-[inset_2px_0_0_0_#7C3AED]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                {/* Active hover border indicator */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-[2px] bg-accent transition-all duration-300",
                  isActive ? "opacity-100 h-full glow-accent" : "opacity-0 h-0 group-hover:opacity-50 group-hover:h-full"
                )} />

                <item.icon
                  size={18}
                  className={cn("shrink-0", isActive ? "text-accent drop-shadow-[0_0_5px_rgba(124,58,237,0.5)]" : "text-slate-500 group-hover:text-slate-300")}
                />

                {sidebarOpen && <span className="truncate">{item.name}</span>}

                {/* Risk Indicator logic */}
                {item.hasBadge && activeHighRiskAlert && (
                  <span className={cn(
                    "absolute right-2 flex h-2 w-2 rounded-full bg-[#FF3B30] animate-pulse-red",
                    !sidebarOpen && "top-2 right-2"
                  )} />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-white/10 p-4">
        <Link
          href="/help"
          className={cn(
            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
            !sidebarOpen && "justify-center px-0"
          )}
        >
          <HelpCircle size={18} />
          {sidebarOpen && <span>Help & Support</span>}
        </Link>
      </div>
    </div>
  )
}
