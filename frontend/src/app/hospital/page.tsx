"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Building2, Shield, AlertTriangle, TrendingUp, Activity, Loader2, Search } from "lucide-react"
import { PageTransition } from "@/components/layout/page-transition"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"

interface HospitalProfile {
  hospital_id: string
  hospital_name?: string
  total_claims: number
  high_risk_count: number
  high_risk_percent: number
  upcoding_count: number
  upcoding_frequency_percent: number
  avg_composite_score: number
  risk_rating: string
  threat_distribution: Record<string, number>
  pattern_distribution: Record<string, number>
}

const RATING_COLORS: Record<string, string> = {
  LOW: "#34C759", MEDIUM: "#FF9F0A", CRITICAL: "#FF3B30", NO_DATA: "#64748b"
}

const PIE_COLORS = ["#34C759", "#FF9F0A", "#FF3B30", "#7C3AED", "#3B82F6"]

export default function HospitalPage() {
  const [hospitalId, setHospitalId] = React.useState("H1")
  const [profile, setProfile] = React.useState<HospitalProfile | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchProfile = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/analytics/hospital/${hospitalId}`)
      if (!res.ok) throw new Error("Failed to load hospital profile")
      const data = await res.json()
      setProfile(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [hospitalId])

  React.useEffect(() => { fetchProfile() }, [fetchProfile])

  const threatPieData = profile ? Object.entries(profile.threat_distribution).map(([name, value]) => ({ name, value })) : []
  const patternPieData = profile ? Object.entries(profile.pattern_distribution).map(([name, value]) => ({ name, value })) : []
  const ratingColor = profile ? RATING_COLORS[profile.risk_rating] || "#64748b" : "#64748b"

  return (
    <PageTransition className="p-4 md:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <Building2 className="text-[var(--accent-color)]" size={28} />
            {profile?.hospital_name || "HOSPITAL INTELLIGENCE"}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 tracking-wide">Real-time fraud intelligence per hospital facility.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input value={hospitalId} onChange={e => setHospitalId(e.target.value.toUpperCase())}
            placeholder="H1" className="w-24 bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] font-mono text-center h-9" />
          <Button onClick={fetchProfile} disabled={loading} className="bg-[var(--accent-color)] hover:bg-[var(--accent-color)]/80 text-white text-xs uppercase tracking-widest font-bold h-9 gap-2">
            <Search size={14} /> Analyze
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[var(--text-secondary)] animate-pulse tracking-widest uppercase text-sm font-mono flex items-center justify-center gap-3">
          <Loader2 className="animate-spin" size={18} /> Analyzing Hospital...
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded border border-[#FF3B30]/30 bg-[#FF3B30]/10 text-[#FF3B30]">
          <AlertTriangle size={16} /><span className="text-sm font-mono">{error}</span>
        </div>
      ) : profile ? (
        <>
          {/* Risk Rating Banner */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-2 overflow-hidden" style={{ borderColor: `${ratingColor}30` }}>
              <CardContent className="p-6 flex items-center gap-6">
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center border-2"
                  style={{ borderColor: `${ratingColor}50`, backgroundColor: `${ratingColor}15` }}>
                  <Building2 size={28} style={{ color: ratingColor }} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Hospital Risk Rating</p>
                  <h2 className="text-2xl font-black uppercase tracking-widest mt-1" style={{ color: ratingColor }}>
                    {profile.hospital_name || profile.hospital_id}
                  </h2>
                  <p className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-tighter">ID: {profile.hospital_id}</p>
                  <p className="text-[var(--text-secondary)] text-sm mt-1">{profile.total_claims} total claims analyzed</p>
                </div>
                <Badge variant={profile.risk_rating === "LOW" ? "success" : profile.risk_rating === "MEDIUM" ? "warning" : "highRisk"}
                  className="text-sm px-4 py-1">{profile.risk_rating}</Badge>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Total Claims", value: profile.total_claims, icon: Activity, color: "#7C3AED" },
              { label: "Avg Score", value: profile.avg_composite_score, icon: TrendingUp, color: "#3B82F6" },
              { label: "High Risk %", value: `${profile.high_risk_percent}%`, icon: AlertTriangle, color: "#FF3B30" },
              { label: "Upcoding %", value: `${profile.upcoding_frequency_percent}%`, icon: Shield, color: "#FF9F0A" },
            ].map((stat, idx) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
                <Card variant="glass" className="border-[var(--border-color)]">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                        <stat.icon size={14} style={{ color: stat.color }} />
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">{stat.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Threat Distribution Pie */}
            {threatPieData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card variant="glass" className="border-[var(--border-color)]">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-widest text-[var(--text-secondary)]">Threat Level Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={threatPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            {threatPieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                            itemStyle={{ color: "#fff" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 justify-center">
                      {threatPieData.map((d, i) => (
                        <span key={d.name} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {d.name}: {d.value}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Pattern Distribution Pie */}
            {patternPieData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card variant="glass" className="border-[var(--border-color)]">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-widest text-[var(--text-secondary)]">Fraud Pattern Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={patternPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            {patternPieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                            itemStyle={{ color: "#fff" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 justify-center">
                      {patternPieData.map((d, i) => (
                        <span key={d.name} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {d.name}: {d.value}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </>
      ) : null}
    </PageTransition>
  )
}
