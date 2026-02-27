"use client"

import { Activity, AlertTriangle, ShieldCheck, Siren, BrainCircuit } from "lucide-react"
import { PageTransition } from "@/components/layout/page-transition"
import { KPICard } from "@/components/dashboard/kpi-card"
import { ClaimVolumeChart, RiskDistributionChart, FraudRadarChart } from "@/components/dashboard/analytics-charts"

export default function Dashboard() {
  return (
    <PageTransition className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <BrainCircuit className="text-accent" size={28} />
          INTELLIGENCE COMMAND CENTER
        </h1>
        <p className="text-slate-400 text-sm tracking-wide">
          Real-time anomaly detection and fraud pattern analysis across network hospitals.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Claims Evaluated"
          value="1,248"
          icon={Activity}
          trend={12.4}
          trendLabel="vs last week"
          accentColor="blue"
          delay={1}
        />
        <KPICard
          title="High Risk Alerts"
          value="87"
          icon={Siren}
          trend={4.2}
          trendLabel="escalation rate"
          accentColor="red"
          delay={2}
        />
        <KPICard
          title="Medium Risk Reviews"
          value="243"
          icon={AlertTriangle}
          trend={-2.1}
          trendLabel="review queue"
          accentColor="amber"
          delay={3}
        />
        <KPICard
          title="Auto-Approved Claims"
          value="918"
          icon={ShieldCheck}
          trend={-5.4}
          trendLabel="approval rate"
          accentColor="green"
          delay={4}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClaimVolumeChart />
        </div>
        <div>
          <RiskDistributionChart />
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div>
          <FraudRadarChart />
        </div>
        <div className="lg:col-span-2 relative">
          {/* Space for the hospital heatmap or a datatable equivalent */}
          <div className="h-[350px] rounded-lg border border-white/10 bg-slate-900/40 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-center">
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
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-4">Awaiting incoming telemetry streams...</p>
            </div>
          </div>
        </div>
      </div>

    </PageTransition>
  )
}
