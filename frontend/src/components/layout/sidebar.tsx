"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ShieldAlert, BarChart3, Fingerprint, Database, Settings, HelpCircle, FileText, Building2, User, LogOut, Sun, Moon, TrendingDown } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useAuthStore } from "@/store/useAuthStore"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  href: string
  icon: any
  hasBadge?: boolean
}

type NavGroups = {
  [key in 'tactical' | 'strategic' | 'system']: NavItem[]
}

const navigation: NavGroups = {
  tactical: [
    { name: "Command Center", href: "/", icon: BarChart3 },
    { name: "Intelligence Alerts", href: "/alerts", icon: ShieldAlert, hasBadge: true },
    { name: "Fraud Patterns", href: "/patterns", icon: Fingerprint },
  ],
  strategic: [
    { name: "Score New Claim", href: "/score", icon: FileText },
    { name: "Dataset Explorer", href: "/dataset", icon: Database },
    { name: "Hospital Intel", href: "/hospital", icon: Building2 },
    { name: "Loss Exposure", href: "/hospital-loss", icon: TrendingDown },
  ],
  system: [
    { name: "Settings", href: "/settings", icon: Settings },
  ]
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, activeHighRiskAlert } = useAppStore()
  const { user, logout, isLoggedIn } = useAuthStore()
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-white/10 glass-panel-heavy transition-all duration-300 z-40",
        sidebarOpen ? "w-64" : "w-16",
        className
      )}
    >
      <div className="flex h-24 items-center px-4">
        <div className="flex items-center gap-4 group">
          <div className="relative flex h-14 w-14 items-center justify-center shrink-0">
            {/* Techy bezel */}
            <div className="absolute inset-0 rounded-xl border border-[var(--accent-color)]/30 group-hover:border-[var(--accent-color)]/60 transition-colors" />
            <div className="absolute inset-1 rounded-lg border border-[var(--accent-color)]/10" />
            <div className="absolute -inset-0.5 rounded-xl border border-[var(--accent-color)]/5 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />

            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_12px_var(--accent-color)] z-10"
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }} />
            <ShieldAlert size={24} className="text-[var(--accent-color)] hidden z-10" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-[0.2em] text-[var(--text-primary)] font-[family-name:var(--font-outfit)] leading-none">
                CLAIM
              </span>
              <span className="text-xl font-black tracking-[0.3em] text-[var(--accent-color)] font-[family-name:var(--font-outfit)] mt-0.5">
                HAWK
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <nav className="flex flex-col gap-6 px-3">
          {Object.entries(navigation).map(([section, items]) => (
            <div key={section} className="space-y-1">
              {sidebarOpen && (
                <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-color)]/60">
                  {section}
                </p>
              )}
              {items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative overflow-hidden",
                      isActive
                        ? "bg-[var(--accent-color)]/10 text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--text-primary)]/5 hover:text-[var(--text-primary)]"
                    )}
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    {/* Active vertical laser */}
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-[2.5px] bg-[var(--accent-color)] transition-all duration-500",
                      isActive ? "h-full opacity-100 shadow-[0_0_12px_var(--accent-color)]" : "h-0 opacity-0 group-hover:h-full group-hover:opacity-30"
                    )} />

                    <item.icon
                      size={18}
                      className={cn(
                        "transition-transform duration-300 group-hover:scale-110",
                        isActive ? "text-[var(--accent-color)]" : "text-[var(--text-secondary)]"
                      )}
                    />

                    {sidebarOpen && (
                      <span className={cn(
                        "truncate tracking-wide",
                        isActive ? "font-bold" : "font-medium"
                      )}>
                        {item.name}
                      </span>
                    )}

                    {item.hasBadge && activeHighRiskAlert && (
                      <span className={cn(
                        "absolute right-3 flex h-1.5 w-1.5 rounded-full bg-[#FF3B30] shadow-[0_0_8px_#FF3B30] animate-pulse",
                        !sidebarOpen && "top-2 right-2"
                      )} />
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* System Status & Controls */}
      <div className="border-t border-white/10 p-4 space-y-4 bg-black/20 backdrop-blur-sm">
        {sidebarOpen && (
          <div className="px-2 py-3 rounded-lg bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-[var(--accent-color)] shadow-[0_0_8px_var(--accent-color)]" />
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-[var(--accent-color)] animate-ping" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Neural Engine: Online</span>
            </div>
            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "30%" }}
                animate={{ width: "85%" }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                className="h-full bg-[var(--accent-color)]"
              />
            </div>
          </div>
        )}

        {isLoggedIn && user && (
          <Link
            href="/profile"
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-[var(--text-primary)]/5",
              pathname === "/profile" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
              !sidebarOpen && "justify-center px-0"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[var(--accent-color)] to-blue-500 p-[1px] shrink-0">
              <div className="h-full w-full rounded-full bg-[var(--bg-primary)] flex items-center justify-center">
                <User size={14} className="text-[var(--accent-color)]" />
              </div>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-[var(--text-primary)]">{user.name || user.email}</p>
                <p className="text-[9px] text-[var(--accent-color)] uppercase tracking-widest font-black">Verified L3</p>
              </div>
            )}
          </Link>
        )}

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--text-primary)]/5 hover:text-[var(--text-primary)]",
              !sidebarOpen && "justify-center px-0"
            )}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {sidebarOpen && <span className="text-[11px] uppercase tracking-widest font-bold">Ambient Theme</span>}
          </button>

          <button
            onClick={handleLogout}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--accent-color)]/60 transition-all hover:bg-[#FF3B30]/10 hover:text-[#FF3B30]",
              !sidebarOpen && "justify-center px-0"
            )}
          >
            <LogOut size={16} />
            {sidebarOpen && <span className="text-[11px] uppercase tracking-widest font-bold">Secure Deauth</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

