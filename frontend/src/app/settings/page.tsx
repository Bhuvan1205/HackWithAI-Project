"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings2, Save, RefreshCw, AlertTriangle, CheckCircle, Shield } from "lucide-react"
import { PageTransition } from "@/components/layout/page-transition"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SystemConfig {
 config_key: string
 config_value: string
 description: string | null
}

const BAND_COLORS: Record<string, string> = {
 LOW_MAX: "#34C759",
 MEDIUM_MAX: "#FF9F0A",
 HIGH_MAX: "#FF3B30",
}

export default function SettingsPage() {
 const [configs, setConfigs] = React.useState<SystemConfig[]>([])
 const [loading, setLoading] = React.useState(true)
 const [saving, setSaving] = React.useState<string | null>(null)
 const [saved, setSaved] = React.useState<string | null>(null)
 const [error, setError] = React.useState<string | null>(null)
 const [localEdits, setLocalEdits] = React.useState<Record<string, string>>({})

 const fetchConfigs = React.useCallback(async () => {
  setLoading(true)
  setError(null)
  try {
   const res = await fetch("http://127.0.0.1:8000/api/v1/config")
   if (!res.ok) throw new Error("Failed to load system config")
   const data = await res.json()
   setConfigs(data)
  } catch (e: any) {
   setError(e.message)
  } finally {
   setLoading(false)
  }
 }, [])

 React.useEffect(() => { fetchConfigs() }, [fetchConfigs])

 const getValue = (key: string, fallback: string) =>
  localEdits[key] !== undefined ? localEdits[key] : fallback

 const handleChange = (key: string, value: string) => {
  setLocalEdits(prev => ({ ...prev, [key]: value }))
 }

 const handleSave = async (key: string) => {
  const value = localEdits[key]
  if (value === undefined) return
  setSaving(key)
  try {
   const res = await fetch(`http://127.0.0.1:8000/api/v1/config/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
   })
   if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail || "Save failed")
   }
   setConfigs(prev => prev.map(c => c.config_key === key ? { ...c, config_value: value } : c))
   setLocalEdits(prev => {
    const copy = { ...prev }
    delete copy[key]
    return copy
   })
   setSaved(key)
   setTimeout(() => setSaved(null), 2000)
  } catch (e: any) {
   setError(`Save failed for ${key}: ${e.message}`)
  } finally {
   setSaving(null)
  }
 }

 return (
  <PageTransition className="p-4 md:p-8 max-w-[900px] mx-auto w-full space-y-6">
   {/* Header */}
   <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
    <div>
     <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
      <Settings2 className="text-accent" size={28} />
      SYSTEM CONFIGURATION
     </h1>
     <p className="text-[var(--text-secondary)] mt-1 tracking-wide">
      Configure risk threshold bands. Changes affect all future scoring in real-time.
     </p>
    </div>
    <Button variant="outline" onClick={fetchConfigs} className="gap-2 text-xs uppercase tracking-widest font-bold">
     <RefreshCw size={14} /> Refresh
    </Button>
   </div>

   {error && (
    <div className="flex items-center gap-3 p-4 rounded border border-[#FF3B30]/30 bg-[#FF3B30]/10 text-[#FF3B30]">
     <AlertTriangle size={16} />
     <span className="text-sm font-mono">{error}</span>
    </div>
   )}

   {/* Threat Level Bands */}
   <Card className="glass-panel-heavy border-white/10">
    <CardHeader className="border-b border-white/10">
     <CardTitle className="text-sm uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
      <Shield size={16} className="text-accent" />
      Threat Level Classification Bands
     </CardTitle>
    </CardHeader>
    <CardContent className="p-6 space-y-4">
     {loading ? (
      <div className="text-center py-10 text-[var(--text-secondary)] animate-pulse text-sm font-mono uppercase tracking-widest">
       Loading Configuration...
      </div>
     ) : (
      configs.map((cfg, idx) => {
       const color = BAND_COLORS[cfg.config_key] || "#64748b"
       const val = getValue(cfg.config_key, cfg.config_value)
       const isDirty = localEdits[cfg.config_key] !== undefined
       const isSaving = saving === cfg.config_key
       const isSaved = saved === cfg.config_key

       return (
        <motion.div
         key={cfg.config_key}
         initial={{ opacity: 0, x: -16 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: idx * 0.08 }}
         className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border border-white/5 bg-black/20"
        >
         <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
           <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
           <span className="font-mono text-sm font-bold text-white">{cfg.config_key}</span>
           {isDirty && <span className="text-[10px] text-[#FF9F0A] font-bold uppercase tracking-widest">● Unsaved</span>}
           {isSaved && <span className="text-[10px] text-[#34C759] font-bold uppercase tracking-widest">✓ Saved</span>}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">{cfg.description}</p>
         </div>
         <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-start gap-1">
           <label className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Max Index (0–100)</label>
           <Input
            type="number"
            min={0}
            max={100}
            value={val}
            onChange={(e) => handleChange(cfg.config_key, e.target.value)}
            className="w-24 bg-slate-900 border-white/10 text-white text-sm font-mono h-8"
            style={{ borderColor: isDirty ? color : undefined }}
           />
          </div>
          <Button
           size="sm"
           disabled={!isDirty || isSaving}
           onClick={() => handleSave(cfg.config_key)}
           className={cn(
            "text-xs uppercase tracking-widest font-bold w-20 transition-all mt-4",
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
        </motion.div>
       )
      })
     )}

     {/* Threshold visualization */}
     {!loading && configs.length > 0 && (
      <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       transition={{ delay: 0.4 }}
       className="mt-6 p-4 rounded-lg border border-white/5 bg-black/30"
      >
       <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-3">Live Risk Band Visualization (0–100)</p>
       <div className="relative h-6 rounded-full overflow-hidden flex">
        {configs.map((cfg, idx) => {
         const prev = idx === 0 ? 0 : parseInt(configs[idx - 1].config_value)
         const curr = parseInt(getValue(cfg.config_key, cfg.config_value))
         const width = curr - prev
         return (
          <div
           key={cfg.config_key}
           className="h-full flex items-center justify-center text-[9px] font-bold text-black"
           style={{ width: `${width}%`, backgroundColor: BAND_COLORS[cfg.config_key] }}
          >
           {width > 5 ? cfg.config_key.replace("_MAX", "") : ""}
          </div>
         )
        })}
        <div className="h-full flex items-center justify-center text-[9px] font-bold text-black bg-purple-500"
         style={{ width: `${100 - parseInt(getValue(configs[configs.length - 1]?.config_key, configs[configs.length - 1]?.config_value || "84"))}%` }}>
         {100 - parseInt(getValue(configs[configs.length - 1]?.config_key, configs[configs.length - 1]?.config_value || "84")) > 3 ? "CRITICAL" : ""}
        </div>
       </div>
      </motion.div>
     )}
    </CardContent>
   </Card>
  </PageTransition>
 )
}
