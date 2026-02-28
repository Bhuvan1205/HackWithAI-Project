"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { User, Shield, Activity, TrendingUp, AlertTriangle, Loader2 } from "lucide-react"
import { PageTransition } from "@/components/layout/page-transition"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/store/useAuthStore"
import { cn } from "@/lib/utils"

interface UserProfile {
 user_id: number
 email: string
 total_claims: number
 avg_composite_score: number
 high_risk_count: number
 high_risk_ratio: number
 risk_label: string
 fraud_patterns: Record<string, number>
}

const RISK_LABEL_COLORS: Record<string, string> = {
 SAFE: "#34C759",
 MONITORED: "#FF9F0A",
 HIGH_RISK_USER: "#FF3B30",
 NO_DATA: "#64748b",
}

export default function ProfilePage() {
 const { token, user } = useAuthStore()
 const [profile, setProfile] = React.useState<UserProfile | null>(null)
 const [loading, setLoading] = React.useState(true)
 const [error, setError] = React.useState<string | null>(null)

 React.useEffect(() => {
  if (!token) return
  // First get user ID from /auth/me, then fetch analytics
  fetch("http://127.0.0.1:8000/api/v1/auth/me", {
   headers: { Authorization: `Bearer ${token}` },
  })
   .then(r => r.json())
   .then(me => {
    return fetch(`http://127.0.0.1:8000/api/v1/analytics/user/${me.id}`, {
     headers: { Authorization: `Bearer ${token}` },
    })
   })
   .then(r => r.json())
   .then(data => setProfile(data))
   .catch(e => setError(e.message))
   .finally(() => setLoading(false))
 }, [token])

 const riskColor = profile ? RISK_LABEL_COLORS[profile.risk_label] || "#64748b" : "#64748b"

 return (
  <PageTransition className="p-4 md:p-8 max-w-[1000px] mx-auto w-full space-y-6">
   <div className="mb-8 flex flex-col items-center md:items-start text-center md:text-left">
    <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
     <User className="text-[var(--accent-color)]" size={28} />
     USER FRAUD PROFILE
    </h1>
    <p className="text-[var(--text-secondary)] mt-1">{user?.email || "—"}</p>
   </div>

   {loading ? (
    <div className="text-center py-20 text-[var(--text-secondary)] animate-pulse tracking-widest uppercase text-sm font-mono flex items-center justify-center gap-3">
     <Loader2 className="animate-spin" size={18} /> Loading Profile Analytics...
    </div>
   ) : error ? (
    <div className="flex items-center gap-3 p-4 rounded border border-[#FF3B30]/30 bg-[#FF3B30]/10 text-[#FF3B30]">
     <AlertTriangle size={16} /><span className="text-sm font-mono">{error}</span>
    </div>
   ) : profile ? (
    <>
     {/* Risk Label Banner */}
     <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-2 overflow-hidden" style={{ borderColor: `${riskColor}30` }}>
       <CardContent className="p-6 flex items-center gap-6">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center border-2"
         style={{ borderColor: `${riskColor}50`, backgroundColor: `${riskColor}15` }}>
         <Shield size={28} style={{ color: riskColor }} />
        </div>
        <div className="flex-1">
         <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">User Risk Classification</p>
         <h2 className="text-2xl font-black uppercase tracking-widest mt-1" style={{ color: riskColor }}>
          {profile?.risk_label?.replace("_", " ") || "UNKNOWN"}
         </h2>
         <p className="text-[var(--text-secondary)] text-sm mt-1">
          Based on {profile.total_claims} scored claims
         </p>
        </div>
        <Badge variant={profile.risk_label === "SAFE" ? "success" : profile.risk_label === "MONITORED" ? "warning" : "highRisk"}
         className="text-sm px-4 py-1 uppercase tracking-widest">
         {profile.risk_label}
        </Badge>
       </CardContent>
      </Card>
     </motion.div>

     {/* Stats Grid */}
     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[
       { label: "Total Claims", value: profile.total_claims, icon: Activity, color: "#7C3AED" },
       { label: "Avg Composite Score", value: profile.avg_composite_score, icon: TrendingUp, color: "#3B82F6" },
       { label: "High Risk Claims", value: profile.high_risk_count, icon: AlertTriangle, color: "#FF3B30" },
       { label: "High Risk Ratio", value: `${(profile.high_risk_ratio * 100).toFixed(0)}%`, icon: Shield, color: "#FF9F0A" },
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

     {/* Fraud Patterns */}
     {Object.keys(profile.fraud_patterns).length > 0 && (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
       <Card variant="glass" className="border-[var(--border-color)]">
        <CardHeader>
         <CardTitle className="text-sm uppercase tracking-widest text-[var(--text-secondary)]">Fraud Pattern Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
         <div className="space-y-3">
          {Object.entries(profile.fraud_patterns).map(([pattern, count]) => {
           const total = Object.values(profile.fraud_patterns).reduce((a, b) => a + b, 0)
           const pct = total > 0 ? (count / total) * 100 : 0
           return (
            <div key={pattern} className="flex items-center gap-4">
             <span className="font-mono text-xs text-[var(--text-secondary)] w-32 uppercase truncate">{pattern}</span>
             <div className="flex-1 h-2 bg-[var(--text-primary)]/10 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--accent-color)] rounded-full transition-all" style={{ width: `${pct}%` }} />
             </div>
             <span className="font-mono text-sm text-[var(--text-primary)] w-16 text-right leading-none">{count} ({pct.toFixed(0)}%)</span>
            </div>
           )
          })}
         </div>
        </CardContent>
       </Card>
      </motion.div>
     )}
    </>
   ) : null}
  </PageTransition>
 )
}
