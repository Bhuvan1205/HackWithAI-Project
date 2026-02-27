"use client"

import { Settings2, Shield } from "lucide-react"
import { PageTransition } from "@/components/layout/page-transition"

export default function SettingsPage() {
  return (
    <PageTransition className="p-8 h-full flex flex-col items-center justify-center text-center">
      <div className="h-24 w-24 rounded-full bg-slate-800/50 border border-white/5 flex flex-col items-center justify-center mb-6">
        <Settings2 size={48} className="text-slate-400" />
      </div>
      <h1 className="text-3xl font-black tracking-tight text-white mb-2 uppercase">System Configuration</h1>
      <p className="text-slate-400 max-w-md">
        Model threshold tuning, webhook endpoints, and RBAC control protocols are restricted to Level 4 Administrators.
      </p>
      <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FF3B30] bg-[#FF3B30]/10 px-4 py-2 border border-[#FF3B30]/30 rounded glow-red">
        <Shield size={16} /> Access Denied
      </div>
    </PageTransition>
  )
}
