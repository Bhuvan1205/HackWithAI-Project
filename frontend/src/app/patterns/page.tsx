"use client"

import { Construction, Layers } from "lucide-react"
import { PageTransition } from "@/components/layout/page-transition"

export default function PatternsPage() {
  return (
    <PageTransition className="p-8 h-full flex flex-col items-center justify-center text-center">
      <div className="h-24 w-24 rounded-full bg-accent/10 border border-accent/20 flex flex-col items-center justify-center glow-accent mb-6 animate-pulse">
        <Layers size={48} className="text-accent" />
      </div>
      <h1 className="text-3xl font-black tracking-tight text-white mb-2 uppercase">Pattern Knowledge Base</h1>
      <p className="text-slate-400 max-w-md">
        The declarative graph rule editor and dynamic pattern builder module is currently undergoing clearance staging.
      </p>
      <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FF9F0A] bg-[#FF9F0A]/10 px-4 py-2 border border-[#FF9F0A]/30 rounded">
        <Construction size={16} /> Under Construction
      </div>
    </PageTransition>
  )
}
