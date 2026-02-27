"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Filter, Download, Play, Search, AlertOctagon, TrendingUp, SlidersHorizontal, Loader2, Database as DBIcon, ArrowRight } from "lucide-react"

import { PageTransition } from "@/components/layout/page-transition"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Fake data for demo
const claimsData = [
  { id: "CLM80392", date: "2024-03-01", hosp: "H1", proc: "P4", amount: 40000, risk: "CRITICAL", score: 94 },
  { id: "CLM11485", date: "2024-03-01", hosp: "H3", proc: "P2", amount: 12000, risk: "LOW", score: 12 },
  { id: "CLM99214", date: "2024-03-01", hosp: "H5", proc: "P6", amount: 85000, risk: "MEDIUM", score: 68 },
  { id: "CLM45001", date: "2024-02-28", hosp: "H1", proc: "P4", amount: 39500, risk: "CRITICAL", score: 88 },
  { id: "CLM77221", date: "2024-02-28", hosp: "H2", proc: "P1", amount: 5000, risk: "LOW", score: 4 },
  { id: "CLM33499", date: "2024-02-27", hosp: "H7", proc: "P5", amount: 55000, risk: "LOW", score: 26 },
]

export default function DatasetExplorerPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [benchmarking, setBenchmarking] = React.useState(false)
  const [benchResults, setBenchResults] = React.useState<any>(null)

  const handleBenchmark = async () => {
    setBenchmarking(true)
    setBenchResults(null)
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/internal/batch-benchmark?n=100", {
        method: "POST"
      })
      if (!res.ok) throw new Error("Benchmark failed")
      const data = await res.json()
      setTimeout(() => {
        setBenchResults(data)
        setBenchmarking(false)
      }, 1000)
    } catch (e) {
      setTimeout(() => {
        setBenchmarking(false)
      }, 1000)
      console.error(e)
    }
  }

  const filtered = claimsData.filter(c =>
    c.id.includes(searchTerm.toUpperCase()) ||
    c.hosp.includes(searchTerm.toUpperCase())
  )

  return (
    <PageTransition className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <DBIcon className="text-blue-500" size={28} />
            TELEMETRY DATALAKE
          </h1>
          <p className="text-slate-400 mt-1 tracking-wide">Explore aggregated historical claim profiles and execute live batch stress tests.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 text-xs uppercase tracking-widest font-bold">
            <Download size={14} /> Export CSV
          </Button>
          <Button onClick={handleBenchmark} disabled={benchmarking} className="bg-accent hover:bg-accent/80 glow-accent text-white gap-2 text-xs uppercase tracking-widest font-bold transition-all w-[240px]">
            {benchmarking ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {benchmarking ? "Executing Stress Test..." : "Trigger Batch Benchmark (100)"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {benchResults && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <Card className="border-[#34C759]/30 glow-green glass-panel bg-[#34C759]/5">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full border border-[#34C759]/50 bg-[#34C759]/20 flex items-center justify-center glow-green text-[#34C759]">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white tracking-widest uppercase">Benchmark Completed</h4>
                      <p className="text-sm text-[#34C759] font-medium mt-1">100 dynamic multi-variate claims scored successfully.</p>
                    </div>
                  </div>
                  <div className="flex gap-8 text-center bg-black/40 rounded-lg p-4 border border-white/5">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#34C759] font-bold">Total Processed</p>
                      <p className="text-2xl font-mono text-white mt-1">{benchResults.total_processed}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#34C759] font-bold">Avg Latency</p>
                      <p className="text-2xl font-mono text-white mt-1">{benchResults.avg_time_per_claim_ms.toFixed(1)}<span className="text-xs text-slate-500 ml-1">ms</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#FF3B30] font-bold">Max Peak</p>
                      <p className="text-2xl font-mono text-white mt-1">{benchResults.max_time_ms.toFixed(1)}<span className="text-xs text-slate-500 ml-1">ms</span></p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="glass-panel-heavy overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 bg-black/20">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Search Claim ID or Hosp..."
              className="pl-9 bg-slate-900 border-white/10 focus-visible:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto gap-2 text-xs font-semibold tracking-wider">
              <Filter size={14} /> PATTERN FILTER
            </Button>
            <Button variant="outline" className="w-full sm:w-auto gap-2 text-xs font-semibold tracking-wider">
              <SlidersHorizontal size={14} /> RISK SLIDERS
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left align-middle">
            <thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-slate-900/80 sticky top-0 border-b border-white/10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-semibold">Claim ID</th>
                <th className="px-6 py-4 font-semibold">Log Date</th>
                <th className="px-6 py-4 font-semibold">Hospital</th>
                <th className="px-6 py-4 font-semibold">Procedure</th>
                <th className="px-6 py-4 font-semibold text-right">Amount Billed</th>
                <th className="px-6 py-4 font-semibold text-center">Composite Score</th>
                <th className="px-6 py-4 font-semibold flex justify-center">Risk Vector</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-transparent">
              {filtered.map((claim, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-blue-500/10 transition-colors group cursor-pointer border-l-2 border-transparent hover:border-blue-500"
                >
                  <td className="px-6 py-4 font-mono text-slate-200 group-hover:text-blue-400 font-medium transition-colors">
                    {claim.id}
                  </td>
                  <td className="px-6 py-4 text-slate-400">{claim.date}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-slate-300">{claim.hosp}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded bg-black/40 border border-white/5 font-mono text-slate-300 shadow-inner">
                      {claim.proc}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-200">
                    ₹{claim.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "font-mono font-bold font-lg drop-shadow-md",
                      claim.score >= 80 ? "text-[#FF3B30]" : claim.score >= 50 ? "text-[#FF9F0A]" : "text-[#34C759]"
                    )}>
                      {claim.score}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-center">
                    <Badge variant={claim.risk === 'CRITICAL' || claim.risk === 'HIGH' ? 'highRisk' : claim.risk === 'MEDIUM' ? 'warning' : 'success'} className="w-24 justify-center">
                      {(claim.risk === 'CRITICAL' || claim.risk === 'HIGH') && <AlertOctagon size={12} className="mr-1" />}
                      {claim.risk === 'MEDIUM' && <TrendingUp size={12} className="mr-1" />}
                      {claim.risk}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-full" asChild>
                      <a href={`/alerts?id=${claim.id}`}>
                        <ArrowRight size={16} />
                      </a>
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No matching telemetry signatures found in the current viewport.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </PageTransition>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || "24"}
      height={props.size || "24"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
