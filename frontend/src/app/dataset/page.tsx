"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Filter, Download, Play, Search, AlertOctagon, TrendingUp, SlidersHorizontal, Loader2, Database as DBIcon, ArrowRight, RefreshCw, X } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { PageTransition } from "@/components/layout/page-transition"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

interface ClaimRow {
 claim_id: string
 hospital_id: string
 hospital_name?: string
 patient_id: string
 patient_name?: string
 procedure_code: string
 claim_amount: number
 package_rate: number
 admission_date: string
 composite_index: number | null
 threat_level: ThreatLevel | null
 fraud_pattern_detected: string | null
 enforcement_state: string | null
}

const RISK_FILTER_OPTIONS: Array<{ label: string; value: ThreatLevel | "" }> = [
 { label: "All", value: "" },
 { label: "LOW", value: "LOW" },
 { label: "MEDIUM", value: "MEDIUM" },
 { label: "HIGH", value: "HIGH" },
 { label: "CRITICAL", value: "CRITICAL" },
]

function CheckCircle2(props: any) {
 return (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || "24"} height={props.size || "24"} viewBox="0 0 24 24"
   fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
  </svg>
 )
}

function DatasetExplorerContent() {
 const searchParams = useSearchParams()
 const initialSearch = searchParams.get("search") || ""

 const [claims, setClaims] = React.useState<ClaimRow[]>([])
 const [loading, setLoading] = React.useState(true)
 const [error, setError] = React.useState<string | null>(null)
 const [searchTerm, setSearchTerm] = React.useState(initialSearch)
 const [riskFilter, setRiskFilter] = React.useState<ThreatLevel | "">("")
 const [minScore, setMinScore] = React.useState("")
 const [maxScore, setMaxScore] = React.useState("")
 const [benchmarking, setBenchmarking] = React.useState(false)
 const [benchResults, setBenchResults] = React.useState<any>(null)

 React.useEffect(() => {
  const q = searchParams.get("search")
  if (q !== null) {
   setSearchTerm(q)
  }
 }, [searchParams])

 const fetchClaims = React.useCallback(async () => {
  setLoading(true)
  setError(null)
  const params = new URLSearchParams()
  if (riskFilter) params.set("risk_level", riskFilter)
  if (minScore) params.set("min_score", minScore)
  if (maxScore) params.set("max_score", maxScore)
  try {
   const res = await fetch(`http://127.0.0.1:8000/api/v1/claims?${params.toString()}`)
   if (!res.ok) throw new Error("Failed to fetch claims")
   const data = await res.json()
   setClaims(data)
  } catch (e: any) {
   setError(e.message)
  } finally {
   setLoading(false)
  }
 }, [riskFilter, minScore, maxScore])

 React.useEffect(() => { fetchClaims() }, [fetchClaims])

 const handleBenchmark = async () => {
  setBenchmarking(true)
  setBenchResults(null)
  try {
   const res = await fetch("http://127.0.0.1:8000/api/v1/internal/batch-benchmark?n=100", { method: "POST" })
   if (!res.ok) throw new Error("Benchmark failed")
   const data = await res.json()
   setTimeout(() => { setBenchResults(data); setBenchmarking(false) }, 800)
  } catch (e) {
   setBenchmarking(false)
   console.error(e)
  }
 }

 const filtered = claims.filter(c =>
  c.claim_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
  c.hospital_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
  c.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (c.hospital_name && c.hospital_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
  (c.patient_name && c.patient_name.toLowerCase().includes(searchTerm.toLowerCase()))
 )

 const scoreColor = (score: number | null) => {
  if (score === null) return "text-[var(--text-secondary)]"
  if (score >= 85) return "text-[#FF3B30]"
  if (score >= 60) return "text-[#FF9F0A]"
  if (score >= 30) return "text-[#FFD60A]"
  return "text-[#34C759]"
 }

 return (
  <PageTransition className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6">
   {/* Header */}
   <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
    <div>
     <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
      <DBIcon className="text-[var(--accent-color)]" size={28} />
      TELEMETRY DATALAKE
     </h1>
     <p className="text-[var(--text-secondary)] mt-1 tracking-wide">
      Live claim profiles from DB · {claims.length} records loaded
     </p>
    </div>
    <div className="flex gap-3">
     <Button variant="outline" onClick={fetchClaims} className="gap-2 text-xs uppercase tracking-widest font-bold">
      <RefreshCw size={14} /> Refresh
     </Button>
     <Button variant="outline" className="gap-2 text-xs uppercase tracking-widest font-bold" onClick={async () => {
      const token = localStorage.getItem('pmjay_token') || '';
      const response = await fetch('http://127.0.0.1:8000/api/v1/export/dataset', {
       headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pmjay_dataset_export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
     }}>
      <Download size={14} /> Export CSV
     </Button>
     <Button onClick={handleBenchmark} disabled={benchmarking}
      className="bg-accent hover:bg-accent/80 glow-accent text-white gap-2 text-xs uppercase tracking-widest font-bold transition-all w-[240px]">
      {benchmarking ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
      {benchmarking ? "Executing Stress Test..." : "Trigger Batch Benchmark (100)"}
     </Button>
    </div>
   </div>

   {/* Benchmark Result */}
   <AnimatePresence>
    {benchResults && (
     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <Card className="border-[#34C759]/30 glow-green glass-panel bg-[#34C759]/5">
       <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full border border-[#34C759]/50 bg-[#34C759]/20 flex items-center justify-center glow-green text-[#34C759]">
           <CheckCircle2 size={24} />
          </div>
          <div>
           <h4 className="text-lg font-bold text-[var(--text-primary)] tracking-widest uppercase">Benchmark Completed</h4>
           <p className="text-sm text-[#34C759] font-medium mt-1">100 dynamic multi-variate claims scored successfully.</p>
          </div>
         </div>
         <div className="flex gap-8 text-center bg-[var(--text-primary)]/5 rounded-lg p-4 border border-[var(--border-color)]">
          <div>
           <p className="text-[10px] uppercase tracking-widest text-[#34C759] font-bold">Total Processed</p>
           <p className="text-2xl font-mono text-[var(--text-primary)] mt-1">{benchResults.total_processed}</p>
          </div>
          <div>
           <p className="text-[10px] uppercase tracking-widest text-[#34C759] font-bold">Avg Latency</p>
           <p className="text-2xl font-mono text-[var(--text-primary)] mt-1">{benchResults.avg_time_per_claim_ms?.toFixed(1)}<span className="text-xs text-[var(--text-secondary)] ml-1">ms</span></p>
          </div>
          <div>
           <p className="text-[10px] uppercase tracking-widest text-[#FF3B30] font-bold">Max Peak</p>
           <p className="text-2xl font-mono text-[var(--text-primary)] mt-1">{benchResults.max_time_ms?.toFixed(1)}<span className="text-xs text-[var(--text-secondary)] ml-1">ms</span></p>
          </div>
         </div>
        </div>
       </CardContent>
      </Card>
     </motion.div>
    )}
   </AnimatePresence>

   {/* Filters */}
   <Card variant="glass" className="overflow-hidden">
    <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-[var(--border-color)] bg-[var(--text-primary)]/5 flex-wrap">
     <div className="relative w-full sm:w-72 group">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-color)] transition-colors" />
      <Input placeholder="Search Claim ID, Hospital, Patient..." className="pl-9 bg-[var(--bg-secondary)] border-[var(--border-color)] focus-visible:ring-blue-500"
       value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
     </div>
     <div className="flex gap-2 items-center flex-wrap">
      {/* Risk Level Filter */}
      <div className="flex gap-1">
       {RISK_FILTER_OPTIONS.map(opt => (
        <button key={opt.value} onClick={() => setRiskFilter(opt.value)}
         className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-all",
          riskFilter === opt.value ? "bg-[var(--accent-color)] border-[var(--accent-color)] text-white" : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]"
         )}>
         {opt.label}
        </button>
       ))}
      </div>
      {/* Score Range */}
      <div className="flex items-center gap-2">
       <Input placeholder="Min" type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(e.target.value)}
        className="w-16 h-8 bg-[var(--bg-secondary)] border-[var(--border-color)] text-sm font-mono text-center" />
       <span className="text-[var(--text-secondary)] text-xs">–</span>
       <Input placeholder="Max" type="number" min={0} max={100} value={maxScore} onChange={e => setMaxScore(e.target.value)}
        className="w-16 h-8 bg-[var(--bg-secondary)] border-[var(--border-color)] text-sm font-mono text-center" />
      </div>
     </div>
    </div>

    {/* Table */}
    <div className="overflow-x-auto">
     <table className="w-full text-sm text-left align-middle">
      <thead className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-bold bg-[var(--bg-secondary)] sticky top-0 border-b border-[var(--border-color)] shadow-sm">
       <tr>
        <th className="px-6 py-4 font-semibold">Claim ID</th>
        <th className="px-6 py-4 font-semibold">Hospital</th>
        <th className="px-6 py-4 font-semibold">Patient</th>
        <th className="px-6 py-4 font-semibold">Procedure</th>
        <th className="px-6 py-4 font-semibold text-right">Amount Billed</th>
        <th className="px-6 py-4 font-semibold text-center">Composite Score</th>
        <th className="px-6 py-4 font-semibold">Fraud Pattern</th>
        <th className="px-6 py-4 font-semibold flex justify-center">Risk Vector</th>
        <th className="px-6 py-4 text-center">Action</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border-color)] bg-transparent">
       {loading ? (
        <tr><td colSpan={8} className="px-6 py-16 text-center text-[var(--text-secondary)] animate-pulse font-mono text-sm uppercase tracking-widest">Loading Live Claims...</td></tr>
       ) : error ? (
        <tr><td colSpan={8} className="px-6 py-16 text-center text-[var(--intel-danger)] font-mono text-sm">{error}</td></tr>
       ) : filtered.length === 0 ? (
        <tr><td colSpan={8} className="px-6 py-12 text-center text-[var(--text-secondary)]">No matching telemetry signatures found in the current viewport.</td></tr>
       ) : (
        filtered.map((claim, idx) => (
         <tr key={claim.claim_id}
          className="hover:bg-[var(--text-primary)]/5 transition-colors group cursor-pointer border-l-2 border-transparent hover:border-[var(--accent-color)]">
          <td className="px-6 py-4 font-mono text-[var(--text-primary)] font-medium transition-colors">{claim.claim_id}</td>
          <td className="px-6 py-4 font-mono text-[var(--text-secondary)]">
           {claim.hospital_name && claim.hospital_name !== claim.hospital_id
            ? <span title={claim.hospital_id}>{claim.hospital_name}</span>
            : claim.hospital_id}
          </td>
          <td className="px-6 py-4 font-mono text-[var(--text-secondary)]">
           {claim.patient_name && claim.patient_name !== claim.patient_id
            ? <span title={claim.patient_id}>{claim.patient_name}</span>
            : claim.patient_id}
          </td>
          <td className="px-6 py-4">
           <span className="px-2 py-1 rounded bg-[var(--text-primary)]/5 border border-[var(--border-color)] font-mono text-[var(--text-secondary)] shadow-inner">{claim.procedure_code}</span>
          </td>
          <td className="px-6 py-4 text-right font-mono text-[var(--text-primary)]">₹{claim.claim_amount.toLocaleString()}</td>
          <td className="px-6 py-4 text-center">
           <span className={cn("font-mono font-bold text-lg drop-shadow-md", scoreColor(claim.composite_index))}>
            {claim.composite_index ?? "—"}
           </span>
          </td>
          <td className="px-6 py-4 font-mono text-xs text-[var(--text-secondary)]">{claim.fraud_pattern_detected || "—"}</td>
          <td className="px-6 py-4 flex justify-center">
           <Badge
            variant={claim.threat_level === "CRITICAL" || claim.threat_level === "HIGH" ? "highRisk" : claim.threat_level === "MEDIUM" ? "warning" : "success"}
            className="w-24 justify-center">
            {(claim.threat_level === "CRITICAL" || claim.threat_level === "HIGH") && <AlertOctagon size={12} className="mr-1" />}
            {claim.threat_level === "MEDIUM" && <TrendingUp size={12} className="mr-1" />}
            {claim.threat_level || "N/A"}
           </Badge>
          </td>
          <td className="px-6 py-4 text-center">
           <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 rounded-full" asChild>
            <a href={`/alerts?id=${claim.claim_id}`}><ArrowRight size={16} /></a>
           </Button>
          </td>
         </tr>
        ))
       )}
      </tbody>
     </table>
    </div>
   </Card>
  </PageTransition>
 )
}

export default function DatasetExplorerPage() {
 return (
  <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center text-[var(--text-secondary)] animate-pulse font-mono tracking-widest uppercase">Initializing Telemetry...</div>}>
   <DatasetExplorerContent />
  </React.Suspense>
 )
}
