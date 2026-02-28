"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ShieldAlert, Fingerprint, Network, Clock, CheckCircle2, ChevronRight, Activity, XOctagon, AlertCircle, FileText, Loader2, X, Building2, User } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { PageTransition } from "@/components/layout/page-transition"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import { cn } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"

const PATTERN_TITLES: Record<string, string> = {
  PHANTOM: "Phantom Billing Pattern",
  UPCODING: "Cost Inflation Pattern",
  REPEAT_ABUSE: "Repeat Procedure Abuse Pattern",
  MIXED: "Multi-Signal Fraud Pattern",
  NONE: "No Fraud Pattern Detected",
}

const THREAT_LEVEL_MAP: Record<string, string> = {
  LOW: "LOW RISK",
  MEDIUM: "ELEVATED RISK",
  HIGH: "CRITICAL THREAT",
  CRITICAL: "CRITICAL THREAT",
}

const RULE_LABELS: Record<string, string> = {
  zero_day_inpatient: "RULE_01: Zero-Day Inpatient Stay",
  high_amount_zscore: "RULE_02: Extreme Cost Deviation",
  repeat_procedure_flag: "RULE_03: Recurring Procedure Abuse",
  near_package_ceiling: "RULE_04: Package Rate Maximization",
  high_patient_frequency: "RULE_05: High Claim Frequency",
}

function FlagshipIntelligenceScreenContent() {
  const searchParams = useSearchParams()
  const claimIdParam = searchParams.get('id') || 'UNKNOWN'

  const { setActiveHighRiskAlert, latestIntelligenceResult, setLatestIntelligenceResult } = useAppStore()
  const [mounted, setMounted] = React.useState(false)
  const [devMode, setDevMode] = React.useState(false)
  const [reportLoading, setReportLoading] = React.useState(false)
  const [reportText, setReportText] = React.useState<string | null>(null)
  const [reportError, setReportError] = React.useState<string | null>(null)
  const [fetchingResult, setFetchingResult] = React.useState(false)
  const [fetchError, setFetchError] = React.useState<string | null>(null)

  const handleGenerateReport = async () => {
    if (!res) return
    setReportLoading(true)
    setReportError(null)
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/generate-report/${res.claim_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Role": "AUDITOR" },
      })
      if (response.status === 503) {
        setReportError("Report generation service temporarily unavailable (LLM offline).")
        return
      }
      if (response.status === 403) {
        setReportError("Unauthorized: Insufficient role for report generation.")
        return
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        setReportError(err?.detail || "Report generation failed.")
        return
      }
      const data = await response.json()
      setReportText(data.report_text)
    } catch (e: any) {
      setReportError(e.message || "Network error during report generation.")
    } finally {
      setReportLoading(false)
    }
  }

  React.useEffect(() => {
    setMounted(true)
    setActiveHighRiskAlert(true)
    return () => setActiveHighRiskAlert(false)
  }, [setActiveHighRiskAlert])

  // Auto-fetch from DB if arriving directly from Dataset Explorer
  React.useEffect(() => {
    if (mounted && !latestIntelligenceResult && claimIdParam !== 'UNKNOWN') {
      setFetchingResult(true)
      setFetchError(null)
      fetch(`http://127.0.0.1:8000/api/v1/intelligence/${claimIdParam}`)
        .then(res => {
          if (!res.ok) throw new Error(`No analysis found for claim ${claimIdParam}`)
          return res.json()
        })
        .then(data => setLatestIntelligenceResult(data))
        .catch(e => setFetchError(e.message))
        .finally(() => setFetchingResult(false))
    }
  }, [mounted, latestIntelligenceResult, claimIdParam, setLatestIntelligenceResult])

  if (!mounted) return null

  // Loading state while fetching from DB
  if (fetchingResult) {
    return (
      <div className="flex flex-col h-[50vh] w-full items-center justify-center p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full border border-accent/40 bg-accent/10 flex items-center justify-center animate-pulse">
          <Activity size={24} className="text-accent" />
        </div>
        <h2 className="text-xl font-bold tracking-widest text-accent uppercase">Loading Intelligence Result</h2>
        <p className="text-[var(--text-secondary)] font-mono text-sm">Fetching stored analysis for {claimIdParam}...</p>
      </div>
    )
  }

  // Error: claim not found in DB
  if (fetchError) {
    return (
      <div className="flex flex-col h-[50vh] w-full items-center justify-center p-8 text-center space-y-4">
        <XOctagon size={48} className="text-[#FF3B30] glow-red" />
        <h2 className="text-2xl font-bold tracking-widest text-[#FF3B30] uppercase">Claim Not Found</h2>
        <p className="text-[var(--text-secondary)]">{fetchError}</p>
        <p className="text-xs text-[var(--text-secondary)] font-mono">Claim ID: {claimIdParam}</p>
      </div>
    )
  }

  // 10. FRONTEND DATA VALIDATION CHECK + 12. LOADING/DEGRADED STATE
  if (!latestIntelligenceResult) {
    console.warn("⚠️ Backend response incomplete — intelligence UI degraded.")
    return (
      <div className="flex flex-col h-[50vh] w-full items-center justify-center p-8 text-center space-y-4">
        <XOctagon size={48} className="text-[#FF3B30] glow-red" />
        <h2 className="text-2xl font-bold tracking-widest text-[#FF3B30] uppercase">⚠ Intelligence Engine Offline</h2>
        <p className="text-[var(--text-secondary)]">Scoring temporarily unavailable or payload missing.</p>
        <Button variant="outline" className="mt-4 border-slate-700" disabled>Action Disabled</Button>
      </div>
    )
  }

  const res = latestIntelligenceResult

  // 10. Validate fields, fallback to NONE
  const safeFraudPattern = res.fraud_pattern_detected || "NONE"
  if (res.final_risk_score === undefined || !res.risk_level) {
    console.warn("⚠️ Backend response incomplete — intelligence UI degraded.")
  }

  // Threat levels based STRICTLY on threat_level
  const tl = res.threat_level || res.risk_level || "LOW"
  const isLow = tl === "LOW"
  const isMedium = tl === "MEDIUM"
  const isHigh = tl === "HIGH"
  const isCritical = tl === "CRITICAL"
  const isSevere = isHigh || isCritical

  // Styling maps
  const themeColor = isLow ? "text-[#10b981]" : isMedium ? "text-[#f59e0b]" : "text-[#ef4444]"
  const themeBg = isLow ? "bg-[#10b981]" : isMedium ? "bg-[#f59e0b]" : "bg-[#ef4444]"
  const themeBorder = isLow ? "border-[#10b981]/50" : isMedium ? "border-[#f59e0b]/50" : "border-[#ef4444]/50"
  const themeGlow = isLow ? "glow-green" : isMedium ? "glow-amber" : "glow-red"

  const threatTitle = isLow ? "LOW RISK" : isMedium ? "ELEVATED RISK" : isHigh ? "HIGH RISK" : "CRITICAL RISK"
  let patternTitle = PATTERN_TITLES[safeFraudPattern] || "Unknown Pattern"

  // Test Case 4: Pure Anomaly (No rules)
  if (safeFraudPattern === "NONE" && !isLow) {
    patternTitle = "Statistical Anomaly"
  }

  // Header and Subheader logic
  const headerText = isLow
    ? "No Significant Fraud Detected"
    : isMedium
      ? `Potential ${patternTitle} Pattern`
      : safeFraudPattern === "NONE"
        ? "Statistical Anomaly Detected"
        : `${patternTitle} Detected – High Confidence`

  const subheaderText = isLow
    ? "Auto Approval Recommended"
    : isMedium
      ? "Review Recommended"
      : "Immediate Investigation Required"

  // Terminology Consistency
  const priorityText = isLow ? "Auto Approve" : isMedium ? "Under Review" : isHigh ? "Escalated" : "Hard Stop"
  const priorityBadgeColor = isLow ? "text-white bg-[#10b981] glow-green" : isMedium ? "text-black bg-[#f59e0b] glow-amber" : "text-white bg-[#ef4444] glow-red"

  // Composite Risk Index & Model Signal Strength
  const compositeIndex = res.composite_index ?? Math.round((res.final_risk_score || 0) * 100)
  const confidenceScore = res.confidence_score ?? 0
  const modelSignalStrength = confidenceScore > 0 ? confidenceScore : compositeIndex

  // 3. Accurate Donut Chart
  const ruleNorm = res.rule_score_norm || 0
  const anomalyNorm = res.anomaly_score_norm || 0

  const ruleWeight = 0.70 * ruleNorm
  const anomalyWeight = 0.30 * anomalyNorm
  const totalWeight = ruleWeight + anomalyWeight

  let ruleContributionPercent = 0
  let anomalyContributionPercent = 0
  if (totalWeight > 0) {
    ruleContributionPercent = (ruleWeight / totalWeight) * 100
    anomalyContributionPercent = (anomalyWeight / totalWeight) * 100
  }

  const donutData = [
    { name: 'Rules Contribution', value: parseFloat(ruleContributionPercent.toFixed(1)), color: '#FF3B30' },
    { name: 'Anomaly Contribution', value: parseFloat(anomalyContributionPercent.toFixed(1)), color: '#FF9F0A' },
  ]

  const hasBreakdownData = totalWeight > 0
  const activeRules = Object.entries(res.rule_triggers || {}).filter(([k, v]) => v)

  return (
    <PageTransition className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 relative">
      {/* 13. DEV MODE TOGGLE */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute -top-4 right-8 z-50">
          <Button size="sm" variant="outline" onClick={() => setDevMode(!devMode)} className="text-[10px] uppercase font-mono h-6 opacity-50 hover:opacity-100 bg-black">
            Dev Mode: {devMode ? "ON" : "OFF"}
          </Button>
        </div>
      )}

      {devMode && (
        <Card className="glass-panel border-accent p-4 mb-4">
          <CardTitle className="text-xs text-accent font-mono mb-2">RAW JSON PAYLOAD</CardTitle>
          <pre className="text-[10px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-words">{JSON.stringify(res, null, 2)}</pre>
        </Card>
      )}

      {/* 1. RISK ALERT HEADER (HERO) */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <Card className={cn("relative overflow-hidden", themeBorder, themeGlow)}>
          {isSevere && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#ef4444]/15 via-transparent to-transparent opacity-50 pointer-events-none" />}

          {isSevere && (
            <div className="absolute top-0 right-0 p-4">
              <div className={cn("text-[10px] font-black tracking-widest uppercase px-6 py-1 transform translate-x-4 rotate-45 border border-white/20 shadow-lg", priorityBadgeColor)}>
                {isCritical ? "FATAL" : "ESCALATE"}
              </div>
            </div>
          )}

          <CardContent className="p-8 relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start justify-between">
            <div className="space-y-4 max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className={cn("text-sm px-3 py-1 gap-2 border-[1.5px] font-bold", themeColor, themeBorder)}>
                  {isSevere ? <XOctagon size={16} /> : <AlertCircle size={16} />} {threatTitle}
                </Badge>
                <div className="flex flex-col">
                  <span className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-widest">Trace Token: {res.claim_id}</span>
                  {(res.hospital_name || res.patient_name) && (
                    <div className="flex gap-4 mt-1">
                      {res.hospital_name && (
                        <span className="text-[var(--accent-color)] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <Building2 size={10} /> {res.hospital_name}
                        </span>
                      )}
                      {res.patient_name && (
                        <span className="text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <User size={10} /> {res.patient_name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[var(--text-primary)] uppercase">{headerText}</h1>
              <p className={cn("text-lg font-medium tracking-wide", themeColor)}>
                Priority: <span className="text-[var(--text-primary)] font-bold ml-1 tracking-normal">{priorityText}</span>
              </p>
            </div>

            {/* 2. RISK SCORE METER */}
            <div className="relative shrink-0 w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeDasharray="283" />
                <motion.circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke={isLow ? "#10b981" : isMedium ? "#f59e0b" : "#ef4444"} strokeWidth="6" strokeDasharray="283"
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 - (283 * (compositeIndex / 100)) }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className={isLow ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" : isMedium ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="text-5xl font-black text-[var(--text-primary)] drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] tracking-tighter"
                >
                  {compositeIndex}
                </motion.span>
                <span className={cn("text-[9px] uppercase tracking-widest mt-1 font-bold", themeColor)}>Composite Risk Index</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* 4. FRAUD PATTERN INTELLIGENCE CARD */}
          <Card className={cn("relative overflow-hidden glass-panel-heavy", themeBorder, themeGlow)}>
            <div className="scan-line absolute inset-0 z-0 opacity-40 mix-blend-screen" />
            <div className={cn("absolute top-0 w-full h-1 bg-gradient-to-r from-transparent to-transparent", isLow ? "via-[#10b981]" : isMedium ? "via-[#f59e0b]" : "via-[#ef4444]")} />
            <CardHeader className="relative z-10 flex flex-row items-center gap-4 pb-2">
              <div className={cn("h-10 w-10 shrink-0 rounded border flex items-center justify-center", themeBorder, themeColor, themeBg.replace("bg-", "bg-").concat("/20"))}>
                <Fingerprint size={20} />
              </div>
              <div>
                <CardTitle className="text-xl tracking-tight font-bold text-[var(--text-primary)]">{headerText}</CardTitle>
                <p className={cn("text-sm font-medium tracking-wide flex items-center gap-2 mt-1", themeColor)}>
                  Model Signal Strength: {modelSignalStrength}% <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", themeBg)} />
                </p>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4 pt-4">

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[var(--text-primary)]/5 p-3 rounded border border-[var(--border-color)] text-center">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">Rule Norm</p>
                  <p className="font-mono text-[var(--text-primary)] text-lg mt-1">{ruleNorm.toFixed(3)}</p>
                </div>
                <div className="bg-[var(--text-primary)]/5 p-3 rounded border border-[var(--border-color)] text-center">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">Anomaly Norm</p>
                  <p className="font-mono text-[var(--text-primary)] text-lg mt-1">{anomalyNorm.toFixed(3)}</p>
                </div>
                <div className="bg-[var(--text-primary)]/5 p-3 rounded border border-[var(--border-color)] text-center">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">Final Risk</p>
                  <p className={cn("font-mono text-lg mt-1 font-bold", themeColor)}>{(res.final_risk_score || 0).toFixed(3)}</p>
                </div>
              </div>

              <p className="text-[var(--text-secondary)] leading-relaxed text-sm">
                {res.explanation || "No specialized explanation generated by the backend."}
              </p>
            </CardContent>
          </Card>

          {/* 5. DETERMINISTIC RULES ACCORDION */}
          {!isLow && activeRules.length > 0 && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-sm tracking-widest text-[var(--text-secondary)] uppercase flex items-center gap-2">
                  <Network size={16} className="text-[var(--accent-color)]" /> Base Knowledge Graph Triggers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {activeRules.map(([ruleKey], idx) => (
                    <AccordionItem key={ruleKey} value={`item-${idx}`} className="border-b border-[var(--border-color)] data-[state=open]:bg-[var(--text-primary)]/5 transition-colors">
                      <AccordionTrigger className="hover:no-underline hover:text-[var(--text-primary)] group">
                        <div className="flex items-center gap-3 text-left">
                          <span className="h-2 w-2 rounded-full bg-[var(--accent-color)] shadow-[0_0_10px_var(--accent-color)]" />
                          <span className="font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-mono text-sm">{RULE_LABELS[ruleKey] || ruleKey}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-9 pt-2 pb-4 text-[var(--text-secondary)] leading-relaxed text-sm">
                        <div className="p-3 bg-[var(--text-primary)]/5 border-l-[3px] border-[var(--accent-color)] text-sm">
                          Feature explicitly triggered based on backend knowledge graph logic.
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* 5.1. Signal Data Card (moved from original position) */}
          {!isLow && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg tracking-tight font-bold text-[var(--text-primary)] uppercase flex items-center gap-2">
                  <Activity size={18} className={themeColor} /> Signal Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(res.feature_values || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--text-primary)]/5 px-2 rounded transition-colors -mx-2">
                      <span className="text-xs tracking-wider font-semibold text-[var(--text-secondary)] uppercase">{key.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-sm text-[var(--text-primary)]">{typeof value === 'number' ? value.toFixed(2) : String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 6. LLM AI INVESTIGATION TOOL */}
          <div className="pt-4 flex flex-col items-start gap-4">
            <Button
              onClick={handleGenerateReport}
              disabled={reportLoading}
              className={cn(
                "px-6 py-4 h-auto text-sm font-bold uppercase tracking-widest transition-all duration-300 rounded-xl",
                "bg-accent hover:bg-accent/80 text-white glow-accent border border-accent/50",
                reportLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {reportLoading ? (
                <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Analyzing with Claim Hawk AI...</>
              ) : (
                <><FileText className="mr-3 h-5 w-5" /> Explain with Claim Hawk AI</>
              )}
            </Button>
            {reportError && (
              <p className="text-sm text-[#FF3B30] font-mono px-2">{reportError}</p>
            )}

            {reportText && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                className="w-full mt-2"
              >
                <Card className="glass-panel-heavy border-accent/30 flex flex-col shadow-[0_4px_30px_rgba(124,58,237,0.15)] relative overflow-hidden">
                  <div className="scan-line absolute inset-0 z-0 opacity-20 pointer-events-none" />
                  <CardHeader className="flex flex-row items-center gap-3 border-b border-white/10 pb-4 relative z-10 bg-accent/5">
                    <div className="h-8 w-8 rounded border border-accent/50 bg-accent/20 flex items-center justify-center text-accent glow-accent">
                      <FileText size={16} />
                    </div>
                    <div>
                      <CardTitle className="text-lg tracking-tight font-bold text-[var(--text-primary)] uppercase">AI Analysis Report</CardTitle>
                      <p className="text-xs text-[var(--text-secondary)] font-mono">Generated by Claim Hawk Intelligence</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 relative z-10">
                    <div className="prose prose-invert prose-sm max-w-none
           [&_h2]:text-[var(--accent-color)] [&_h2]:text-sm [&_h2]:uppercase [&_h2]:tracking-widest [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:border-b [&_h2]:border-[var(--border-color)] [&_h2]:pb-2
           [&_h3]:text-[var(--text-primary)] [&_h3]:text-xs [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:font-semibold [&_h3]:mt-4
           [&_p]:text-[var(--text-secondary)] [&_p]:leading-relaxed [&_p]:text-sm
           [&_strong]:text-[var(--text-primary)]
           [&_ul]:text-[var(--text-secondary)] [&_ul]:text-sm
           [&_li]:text-[var(--text-secondary)] [&_li]:text-sm
          ">
                      {reportText.split('\n').map((line, i) => {
                        if (line.startsWith('## ')) return <h2 key={i}>{line.replace('## ', '')}</h2>
                        if (line.startsWith('### ')) return <h3 key={i}>{line.replace('### ', '')}</h3>
                        if (line.startsWith('**') && line.endsWith('**')) return <p key={i}><strong>{line.replace(/\*\*/g, '')}</strong></p>
                        if (line.startsWith('- ')) return <li key={i}>{line.replace('- ', '')}</li>
                        if (line.trim() === '') return <br key={i} />
                        return <p key={i}>{line}</p>
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Column: Graphs & Timeline */}
        <div className="space-y-6">

          {/* 3. RISK CONTRIBUTION MODEL */}
          {hasBreakdownData ? (
            <Card className="glass-panel">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm tracking-widest text-[var(--text-secondary)] uppercase text-center">Risk Signal Assembly</CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex flex-col justify-center items-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
                      paddingAngle={5} dataKey="value"
                      stroke="none"
                      animationDuration={1500}
                      animationBegin={400}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer outline-none" />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val) => `${val}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col mt-4">
                  <Network className="text-[var(--text-secondary)] h-8 w-8 mb-1" />
                </div>
              </CardContent>
              <div className="px-6 pb-6 mt-4 pt-0 flex justify-between gap-4">
                {donutData.map(d => (
                  <div key={d.name} className="flex-1 text-center">
                    <div className="h-1 w-full rounded-full mb-2 opacity-50" style={{ backgroundColor: d.color }} />
                    <p className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-primary)] truncate">{d.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{d.value}%</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="glass-panel opacity-50 border-dashed border-[var(--border-color)]">
              <CardContent className="h-64 flex flex-col justify-center items-center text-center p-6 space-y-4">
                <ShieldAlert size={32} className="text-[var(--text-secondary)]" />
                <p className="text-sm text-[var(--text-secondary)]">Risk breakdown telemetry unavailable or insufficient for assembly.</p>
              </CardContent>
            </Card>
          )}

          {/* 7. INVESTIGATION TIMELINE */}
          <Card variant="glass" className="flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm tracking-widest text-[var(--text-secondary)] uppercase flex items-center gap-2">
                <Clock size={16} /> Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-[var(--border-color)] ml-3 space-y-8 pb-4">

                {isCritical && (
                  <div className="relative pl-6">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[var(--intel-danger)] glow-red animate-pulse-red" />
                    <p className="text-xs text-[var(--text-secondary)] font-mono mb-1">{mounted ? new Date().toLocaleTimeString() : '--:--:--'} - Today</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Hard-stop activated</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Pending mandatory manual investigator review.</p>
                  </div>
                )}

                {isHigh && (
                  <div className="relative pl-6">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[var(--intel-danger)] glow-red animate-pulse-red" />
                    <p className="text-xs text-[var(--text-secondary)] font-mono mb-1">{mounted ? new Date().toLocaleTimeString() : '--:--:--'} - Today</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Escalated</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Pending priority investigator review.</p>
                  </div>
                )}

                {isMedium && (
                  <div className="relative pl-6">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[#f59e0b] glow-amber" />
                    <p className="text-xs text-[var(--text-secondary)] font-mono mb-1">{mounted ? new Date().toLocaleTimeString() : '--:--:--'} - Today</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Review Tag Added</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Flagged for standard compliance queuing.</p>
                  </div>
                )}

                {isLow && (
                  <div className="relative pl-6">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[#10b981] glow-green" />
                    <p className="text-xs text-[var(--text-secondary)] font-mono mb-1">{mounted ? new Date().toLocaleTimeString() : '--:--:--'} - Today</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Auto-Approved</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Claim passed intelligence checks. Processing scheduled.</p>
                  </div>
                )}

                <div className="relative pl-6">
                  <span className={cn("absolute -left-[5px] top-1 h-2 w-2 rounded-full", themeGlow, themeBg)} />
                  <p className="text-xs text-[var(--text-secondary)] font-mono mb-1">{mounted ? new Date(Date.now() - 2000).toLocaleTimeString() : '--:--:--'} - Today</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Algorithms Intercepted Payload</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Calculated final risk score of {(res.final_risk_score || 0).toFixed(4)}</p>
                </div>

                <div className="relative pl-6 opacity-60">
                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[#34C759]" />
                  <p className="text-xs text-[var(--text-secondary)] font-mono mb-1">{mounted ? new Date(Date.now() - 5000).toLocaleTimeString() : '--:--:--'} - Today</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">API Gateway Received Claim</p>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>



    </PageTransition>
  )
}

export default function FlagshipIntelligenceScreen() {
  return (
    <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background text-accent animate-pulse font-mono tracking-widest uppercase">Initializing Intelligence Core...</div>}>
      <FlagshipIntelligenceScreenContent />
    </React.Suspense>
  )
}
