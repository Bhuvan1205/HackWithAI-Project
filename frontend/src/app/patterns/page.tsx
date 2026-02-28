"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Layers, Shield, ToggleLeft, ToggleRight, Save, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react"
import { PageTransition } from "@/components/layout/page-transition"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface RuleConfig {
 id: number
 rule_key: string
 description: string
 threshold_value: number | null
 is_enabled: boolean
 updated_at: string | null
}

export default function PatternsPage() {
 const [rules, setRules] = React.useState<RuleConfig[]>([])
 const [loading, setLoading] = React.useState(true)
 const [saving, setSaving] = React.useState<string | null>(null)
 const [saved, setSaved] = React.useState<string | null>(null)
 const [error, setError] = React.useState<string | null>(null)
 const [localEdits, setLocalEdits] = React.useState<Record<string, Partial<RuleConfig>>>({})

 const fetchRules = React.useCallback(async () => {
  setLoading(true)
  setError(null)
  try {
   const res = await fetch("http://127.0.0.1:8000/api/v1/rules")
   if (!res.ok) throw new Error("Failed to load rules")
   const data = await res.json()
   setRules(data)
  } catch (e: any) {
   setError(e.message)
  } finally {
   setLoading(false)
  }
 }, [])

 React.useEffect(() => { fetchRules() }, [fetchRules])

 const getEdit = (ruleKey: string, field: keyof RuleConfig, fallback: any) =>
  localEdits[ruleKey]?.[field] !== undefined ? localEdits[ruleKey][field] : fallback

 const handleThresholdChange = (ruleKey: string, value: string) => {
  setLocalEdits(prev => ({
   ...prev,
   [ruleKey]: { ...prev[ruleKey], threshold_value: value === "" ? null : parseFloat(value) }
  }))
 }

 const handleToggle = (ruleKey: string, current: boolean) => {
  setLocalEdits(prev => ({
   ...prev,
   [ruleKey]: { ...prev[ruleKey], is_enabled: !current }
  }))
 }

 const handleSave = async (ruleKey: string) => {
  const edits = localEdits[ruleKey]
  if (!edits) return
  setSaving(ruleKey)
  try {
   const res = await fetch(`http://127.0.0.1:8000/api/v1/rules/${ruleKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(edits),
   })
   if (!res.ok) throw new Error("Save failed")
   const updated = await res.json()
   setRules(prev => prev.map(r => r.rule_key === ruleKey ? updated : r))
   setLocalEdits(prev => {
    const copy = { ...prev }
    delete copy[ruleKey]
    return copy
   })
   setSaved(ruleKey)
   setTimeout(() => setSaved(null), 2000)
  } catch (e: any) {
   setError(`Save failed for ${ruleKey}: ${e.message}`)
  } finally {
   setSaving(null)
  }
 }

 const hasChanges = (ruleKey: string) => !!localEdits[ruleKey] && Object.keys(localEdits[ruleKey]).length > 0

 return (
  <PageTransition className="p-4 md:p-8 max-w-[1200px] mx-auto w-full space-y-6">
   {/* Header */}
   <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
    <div>
     <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
      <Layers className="text-accent" size={28} />
      FRAUD RULE ENGINE
     </h1>
     <p className="text-[var(--text-secondary)] mt-1 tracking-wide">
      Configure detection thresholds and enable/disable rules live — changes take effect on next scored claim.
     </p>
    </div>
    <Button variant="outline" onClick={fetchRules} className="gap-2 text-xs uppercase tracking-widest font-bold">
     <RefreshCw size={14} /> Refresh
    </Button>
   </div>

   {error && (
    <div className="flex items-center gap-3 p-4 rounded border border-[#FF3B30]/30 bg-[#FF3B30]/10 text-[#FF3B30]">
     <AlertTriangle size={16} />
     <span className="text-sm font-mono">{error}</span>
    </div>
   )}

   {loading ? (
    <div className="text-center py-20 text-[var(--text-secondary)] animate-pulse tracking-widest uppercase text-sm font-mono">
     Loading Rule Configuration...
    </div>
   ) : (
    <div className="grid gap-4">
     {rules.map((rule, idx) => {
      const isEnabled = getEdit(rule.rule_key, "is_enabled", rule.is_enabled) as boolean
      const thresholdVal = getEdit(rule.rule_key, "threshold_value", rule.threshold_value)
      const isDirty = hasChanges(rule.rule_key)
      const isSaving = saving === rule.rule_key
      const isSaved = saved === rule.rule_key

      return (
       <motion.div
        key={rule.rule_key}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.06 }}
       >
        <Card className={cn(
         "glass-panel border transition-all duration-300",
         isEnabled ? "border-accent/20" : "border-white/5 opacity-60"
        )}>
         <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Rule Info */}
          <div className="flex-1 min-w-0">
           <div className="flex items-center gap-3 mb-1">
            <Shield size={14} className={isEnabled ? "text-accent" : "text-[var(--text-secondary)]"} />
            <span className="font-mono text-sm font-bold text-white uppercase tracking-wider">
             {rule.rule_key}
            </span>
            <Badge variant={isEnabled ? "success" : "secondary"} className="text-[10px]">
             {isEnabled ? "ACTIVE" : "DISABLED"}
            </Badge>
            {isDirty && <Badge variant="warning" className="text-[10px]">UNSAVED</Badge>}
            {isSaved && <Badge variant="success" className="text-[10px]">✓ SAVED</Badge>}
           </div>
           <p className="text-xs text-[var(--text-secondary)] pl-5">{rule.description}</p>
          </div>

          {/* Threshold Input */}
          <div className="flex items-center gap-2 shrink-0">
           {rule.threshold_value !== null ? (
            <div className="flex flex-col items-start gap-1">
             <label className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Threshold</label>
             <Input
              type="number"
              step="0.01"
              value={thresholdVal ?? ""}
              onChange={(e) => handleThresholdChange(rule.rule_key, e.target.value)}
              className="w-28 bg-slate-900 border-white/10 text-white text-sm font-mono h-8"
              disabled={!isEnabled}
             />
            </div>
           ) : (
            <span className="text-xs text-[var(--text-secondary)] italic w-28 text-center">Flag-based</span>
           )}

           {/* Toggle */}
           <button
            onClick={() => handleToggle(rule.rule_key, isEnabled)}
            className={cn(
             "transition-colors p-1 rounded",
             isEnabled ? "text-accent hover:text-accent/70" : "text-[var(--text-secondary)] hover:text-white"
            )}
            title={isEnabled ? "Disable rule" : "Enable rule"}
           >
            {isEnabled
             ? <ToggleRight size={32} />
             : <ToggleLeft size={32} />
            }
           </button>

           {/* Save Button */}
           <Button
            size="sm"
            disabled={!isDirty || isSaving}
            onClick={() => handleSave(rule.rule_key)}
            className={cn(
             "text-xs uppercase tracking-widest font-bold w-20 transition-all",
             isDirty ? "bg-accent hover:bg-accent/80 text-white" : "opacity-30"
            )}
           >
            {isSaving ? (
             <RefreshCw size={12} className="animate-spin" />
            ) : isSaved ? (
             <CheckCircle size={12} />
            ) : (
             <><Save size={12} className="mr-1" /> Save</>
            )}
           </Button>
          </div>
         </CardContent>
        </Card>
       </motion.div>
      )
     })}
    </div>
   )}
  </PageTransition>
 )
}
