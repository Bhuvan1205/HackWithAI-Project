"use client"
import * as React from "react"
import { Activity, AlertTriangle, ShieldCheck, Siren, BrainCircuit, Loader2 } from "lucide-react"
import { PageTransition } from "@/components/layout/page-transition"
import { KPICard } from "@/components/dashboard/kpi-card"
import { ClaimVolumeChart, RiskDistributionChart, FraudRadarChart } from "@/components/dashboard/analytics-charts"

export default function Dashboard() {
  const [metrics, setMetrics] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/intelligence-metrics")
        if (res.ok) {
          const data = await res.json()
          setMetrics(data)
        }
      } catch (e) {
        console.error("Dashboard metrics fetch failed", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])
  return (
    <PageTransition className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <BrainCircuit className="text-accent" size={28} />
          INTELLIGENCE COMMAND CENTER
        </h1>
        <p className="text-[var(--text-secondary)] text-sm tracking-wide">
          Real-time anomaly detection and fraud pattern analysis across network hospitals.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Claims Evaluated"
          value={loading ? "..." : (metrics?.total_scored || 0).toLocaleString()}
          icon={Activity}
          trend={loading ? 0 : 4.2}
          trendLabel="live metrics"
          accentColor="blue"
          delay={1}
        />
        <KPICard
          title="High/Critical Alerts"
          value={loading ? "..." : ((metrics?.threat_level_distribution?.HIGH || 0) + (metrics?.threat_level_distribution?.CRITICAL || 0)).toLocaleString()}
          icon={Siren}
          trend={loading ? 0 : 1.5}
          trendLabel="active threat"
          accentColor="red"
          delay={2}
        />
        <KPICard
          title="Medium Risk Reviews"
          value={loading ? "..." : (metrics?.threat_level_distribution?.MEDIUM || 0).toLocaleString()}
          icon={AlertTriangle}
          trend={loading ? 0 : -0.8}
          trendLabel="queue depth"
          accentColor="amber"
          delay={3}
        />
        <KPICard
          title="Auto-Approved Claims"
          value={loading ? "..." : (metrics?.threat_level_distribution?.LOW || 0).toLocaleString()}
          icon={ShieldCheck}
          trend={loading ? 0 : 12.1}
          trendLabel="standard pass"
          accentColor="green"
          delay={4}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClaimVolumeChart />
        </div>
        <div>
          <RiskDistributionChart data={metrics?.threat_level_distribution} loading={loading} />
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div>
          <FraudRadarChart />
        </div>
        <div className="lg:col-span-2 relative">
          {/* Space for the hospital heatmap or a datatable equivalent */}
          <div className="h-[350px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-mesh opacity-30" />
            <div className="scan-line absolute inset-0 z-0" />
            <div className="relative z-10 text-center space-y-2">
              <p className="text-sm font-medium tracking-widest text-[#FF3B30] uppercase animate-pulse">Live Signal Monitor Active</p>
              <div className="flex gap-1 justify-center items-end h-8">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 bg-[#FF3B30]/60 rounded-t"
                    style={{
                      height: `${((i * 47) % 80) + 10}%`,
                      animation: `pulse-red ${1 + (((i * 31) % 100) / 100)}s infinite alternate`
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mt-4">Awaiting incoming telemetry streams...</p>
            </div>
          </div>
        </div>
      </div>

    </PageTransition>
  )
}
