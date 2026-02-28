"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  TrendingDown,
  AlertTriangle,
  Loader2,
  Building2,
  Activity,
} from "lucide-react"
import { PageTransition } from "@/components/layout/page-transition"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface HospitalLossItem {
  hospital_id: string
  total_claims: number
  high_risk_claims: number
  total_claim_amount: number
  risk_weighted_loss: number
  fraud_exposure_percentage: number
}

type Range = "7d" | "30d" | "all"

const RANGES: { label: string; value: Range }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "ALL", value: "all" },
]

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val)

function ExposureBadge({ pct }: { pct: number }) {
  const high = pct > 30
  const mid = pct >= 15

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        high
          ? "bg-red-500/10 text-red-400 border-red-500/20"
          : mid
            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : "bg-green-500/10 text-green-400 border-green-500/20"
      )}
    >
      {pct}%
    </span>
  )
}

export default function HospitalLossPage() {
  const [range, setRange] = React.useState<Range>("all")
  const [data, setData] = React.useState<HospitalLossItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async (r: Range) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/hospital-loss?range=${r}`
      )
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const json: HospitalLossItem[] = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData(range)
  }, [range, fetchData])

  const chartData = data.slice(0, 10)

  return (
    <PageTransition className="p-4 md:p-8 max-w-[1300px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <TrendingDown className="text-[var(--accent-color)]" size={28} />
            Hospital Loss Exposure
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 tracking-wide text-sm">
            Real-time risk-weighted financial loss contribution per hospital.
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                range === r.value
                  ? "bg-[var(--accent-color)] text-white shadow-[0_0_16px_var(--accent-color)] scale-105"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-[var(--text-secondary)] gap-3 animate-pulse">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm uppercase tracking-widest font-mono">
            Fetching intelligence data…
          </span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-[#FF3B30]/30 bg-[#FF3B30]/10 text-[#FF3B30]">
          <AlertTriangle size={16} />
          <span className="text-sm font-mono">{error}</span>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--text-secondary)]">
          <Activity size={40} className="mb-4 opacity-30" />
          <p className="text-sm font-mono uppercase tracking-widest">
            No scored claims found for this period.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card variant="glass" className="border-[var(--border-color)] overflow-hidden">
              <CardHeader className="pb-0 pt-5 px-5">
                <CardTitle className="text-xs uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
                  <Building2 size={14} className="text-[var(--accent-color)]" />
                  Ranked Hospital Loss
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 mt-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] bg-[var(--bg-secondary)]/60">
                        <th className="px-5 py-3 font-semibold">Hospital</th>
                        <th className="px-5 py-3 font-semibold text-right">
                          Claims{" "}
                          <span className="text-red-400/70">(High Risk)</span>
                        </th>
                        <th className="px-5 py-3 font-semibold text-right">
                          Est. Loss
                        </th>
                        <th className="px-5 py-3 font-semibold text-center">
                          Exposure %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, idx) => (
                        <motion.tr
                          key={row.hospital_id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="border-b border-[var(--border-color)]/50 hover:bg-[var(--accent-color)]/5 transition-colors"
                        >
                          <td className="px-5 py-3.5 font-mono font-semibold text-[var(--text-primary)]">
                            {idx < 3 && (
                              <span className="inline-block w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black text-center leading-5 mr-2">
                                {idx + 1}
                              </span>
                            )}
                            {row.hospital_id}
                          </td>
                          <td className="px-5 py-3.5 text-right text-[var(--text-secondary)] font-mono">
                            {row.total_claims}{" "}
                            <span className="text-red-400/80">
                              ({row.high_risk_claims})
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-[var(--text-primary)] font-mono">
                            {formatINR(row.risk_weighted_loss)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <ExposureBadge pct={row.fraud_exposure_percentage} />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card variant="glass" className="border-[var(--border-color)] h-full min-h-[400px]">
              <CardHeader className="pb-0 pt-5 px-5">
                <CardTitle className="text-xs uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
                  <TrendingDown size={14} className="text-[var(--accent-color)]" />
                  Top 10 — Risk Weighted Loss
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  >
                    <XAxis
                      dataKey="hospital_id"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "var(--bg-secondary)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      itemStyle={{ color: "#e2e8f0" }}
                      formatter={(value: number | undefined) => [value != null ? formatINR(value) : "—", "Risk Weighted Loss"]}
                    />
                    <Bar dataKey="risk_weighted_loss" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i < 3 ? "#ef4444" : "#f59e0b"}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </PageTransition>
  )
}
