"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronRight, ChevronLeft, Loader2, AlertCircle, FilePlus2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { PageTransition } from "@/components/layout/page-transition"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/useAppStore"

const steps = [
  { id: "patient", name: "Patient Profile" },
  { id: "facility", name: "Facility Data" },
  { id: "clinical", name: "Clinical Details" },
  { id: "financial", name: "Financial Metrics" },
]

export default function ScoreClaimPage() {
  const router = useRouter()
  const { setLatestIntelligenceResult } = useAppStore()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [direction, setDirection] = React.useState(1)

  const [formData, setFormData] = React.useState({
    claim_id: "CLM" + Math.floor(Math.random() * 90000 + 10000),
    hospital_id: "H1",
    patient_id: "PAT0001",
    procedure_code: "P4",
    package_rate: "40000",
    claim_amount: "40000",
    admission_date: "2024-03-01",
    discharge_date: "2024-03-04",
    is_inpatient: "1"
  })

  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error" | "503" | "409" | "500">("idle")
  const [errorMessage, setErrorMessage] = React.useState("")

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMessage("")

    try {
      // Validate dates
      if (new Date(formData.discharge_date) < new Date(formData.admission_date)) {
        throw new Error("Discharge date cannot be before admission date")
      }

      const payload = {
        ...formData,
        package_rate: parseFloat(formData.package_rate),
        claim_amount: parseFloat(formData.claim_amount),
        is_inpatient: parseInt(formData.is_inpatient)
      }

      const response = await fetch(`http://127.0.0.1:8000/api/v1/score-intelligence?test_case=${payload.is_inpatient}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        if (response.status === 503) {
          setStatus("503")
          return
        }
        if (response.status === 409) {
          setStatus("409")
          return
        }
        if (response.status >= 500) {
          setStatus("500")
          return
        }

        let errorData: any = {}
        try { errorData = await response.json() } catch (e) { }
        throw new Error(errorData?.detail || "Scoring failed")
      }

      const result = await response.json()
      setStatus("success")
      setLatestIntelligenceResult(result)

      // Navigate to results
      setTimeout(() => {
        router.push(`/alerts?id=${result.claim_id}`)
      }, 1500)

    } catch (err: any) {
      setStatus("error")
      setErrorMessage(err.message || "An unexpected error occurred")
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  }

  return (
    <PageTransition className="p-6 md:p-8 max-w-4xl mx-auto w-full pt-12">

      <div className="mb-8 flex flex-col items-center text-center space-y-2">
        <div className="h-12 w-12 rounded-full border border-accent/30 bg-accent/10 flex items-center justify-center glow-accent mb-2">
          <FilePlus2 className="text-accent" size={24} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Intelligence Profiling Engine</h1>
        <p className="text-slate-400">Submit a new claim telemetry payload for real-time anomaly analysis.</p>
      </div>

      {/* 503 Degraded Banner */}
      <AnimatePresence>
        {status === '503' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 p-4 rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/10 text-[#f59e0b] flex items-center gap-4 glow-amber w-full"
          >
            <AlertCircle size={28} className="animate-pulse" />
            <div className="text-left">
              <h3 className="font-bold uppercase tracking-widest text-sm">Model Degraded (503)</h3>
              <p className="text-xs mt-1 text-slate-300">Intelligence pipeline is currently offline or saturated. Please stand by.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-slate-800 -z-10" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-accent transition-all duration-500 -z-10 glow-accent"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 relative z-10 bg-background px-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border",
                  isActive ? "bg-accent border-accent text-white shadow-[0_0_15px_rgba(124,58,237,0.5)] scale-110" :
                    isCompleted ? "bg-slate-800 border-accent/50 text-accent" :
                      "bg-slate-900 border-slate-700 text-slate-500"
                )}>
                  {isCompleted ? <Check size={14} /> : index + 1}
                </div>
                <span className={cn(
                  "text-[10px] uppercase tracking-wider font-semibold absolute -bottom-6 whitespace-nowrap",
                  isActive ? "text-white" : isCompleted ? "text-slate-300" : "text-slate-600"
                )}>
                  {step.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <Card className="glass-panel-heavy mt-12 overflow-hidden border-t-accent/50">
        <form onSubmit={handleSubmit}>
          <div className="relative overflow-hidden min-h-[300px] p-6">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                className="absolute inset-0 p-6 space-y-6"
              >

                {currentStep === 0 && (
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label>Claim Identifier (Auto-generated)</Label>
                      <Input
                        value={formData.claim_id}
                        onChange={(e) => setFormData({ ...formData, claim_id: e.target.value })}
                        className="font-mono text-accent bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Patient Identifier</Label>
                      <Input
                        required
                        value={formData.patient_id}
                        onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                        placeholder="e.g. PAT0001"
                        className="font-mono uppercase transition-all focus:border-accent"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label>Hospital Identifier</Label>
                      <Input
                        required
                        value={formData.hospital_id}
                        onChange={(e) => setFormData({ ...formData, hospital_id: e.target.value })}
                        placeholder="e.g. H1 to H10"
                        className="font-mono uppercase transition-all focus:border-accent"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Procedure Code</Label>
                      <Input
                        required
                        value={formData.procedure_code}
                        onChange={(e) => setFormData({ ...formData, procedure_code: e.target.value })}
                        placeholder="e.g. P4"
                        className="font-mono uppercase transition-all focus:border-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Inpatient Status (1=Yes, 0=No)</Label>
                      <Input
                        required type="number" min="0" max="1"
                        value={formData.is_inpatient}
                        onChange={(e) => setFormData({ ...formData, is_inpatient: e.target.value })}
                        className="font-mono transition-all focus:border-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Admission Date</Label>
                      <Input
                        required type="date"
                        value={formData.admission_date}
                        onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                        className="transition-all focus:border-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Discharge Date</Label>
                      <Input
                        required type="date"
                        value={formData.discharge_date}
                        onChange={(e) => setFormData({ ...formData, discharge_date: e.target.value })}
                        className="transition-all focus:border-accent"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Authorised Package Rate (₹)</Label>
                      <Input
                        required type="number" step="0.01" min="1"
                        value={formData.package_rate}
                        onChange={(e) => setFormData({ ...formData, package_rate: e.target.value })}
                        className="font-mono text-emerald-400 focus:border-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Claim Amount Billed (₹)</Label>
                      <Input
                        required type="number" step="0.01" min="1"
                        value={formData.claim_amount}
                        onChange={(e) => setFormData({ ...formData, claim_amount: e.target.value })}
                        className="font-mono text-amber-400 focus:border-accent"
                      />
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          <CardFooter className="flex justify-between border-t border-white/5 bg-black/20 p-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0 || status === 'loading'}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={handleNext} className="bg-accent hover:bg-accent/80 text-white glow-accent">
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <motion.button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 h-10 px-8 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
                  status === 'idle' ? "bg-[#34C759] text-white hover:bg-[#34C759]/90 glow-green" :
                    status === 'loading' ? "bg-slate-700 text-slate-300 cursor-not-allowed" :
                      status === 'success' ? "bg-[#34C759] text-white shadow-[0_0_30px_rgba(52,199,89,0.8)]" :
                        "bg-[#FF3B30] text-white animate-shake glow-red"
                )}
                whileTap={status === 'idle' ? { scale: 0.95 } : {}}
              >
                {status === 'idle' && "Execute Analysis 🚀"}
                {status === 'loading' && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>}
                {status === 'success' && <><Check className="mr-2 h-4 w-4 drop-shadow-md" /> Intercepted</>}
                {status === 'error' && <><AlertCircle className="mr-2 h-4 w-4" /> Retry Analysis</>}
              </motion.button>
            )}
          </CardFooter>
        </form>
      </Card>

      {/* 500 Fallback Error Card */}
      <AnimatePresence>
        {status === '500' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="mt-8 border-[#FF3B30]/50 glass-panel bg-[#FF3B30]/10 glow-red p-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="text-[#FF3B30] w-10 h-10" />
                <div>
                  <h3 className="text-[#FF3B30] font-bold uppercase tracking-widest">Crucial System Exception (500)</h3>
                  <p className="text-sm text-slate-300">The intelligence engine encountered a fatal runtime error.</p>
                </div>
              </div>
              <Button className="mt-6 bg-[#FF3B30]/20 text-[#FF3B30] hover:bg-[#FF3B30]/40 w-full font-bold uppercase tracking-widest" onClick={() => setStatus("idle")}>
                Reset Telemetry Stream
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 409 Duplicate Claim Modal */}
      <AnimatePresence>
        {status === '409' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-md"
            >
              <Card className="border-[#34C759]/50 glass-panel-heavy glow-green p-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full border-2 border-[#34C759] flex items-center justify-center bg-[#34C759]/20 text-[#34C759] shadow-[0_0_15px_rgba(52,199,89,0.5)]">
                  <Check size={32} />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest mt-4">Duplicate Claim Detected</h3>
                <p className="text-sm text-slate-400 pb-4">Telemetry signature for <span className="font-mono text-white">{formData.claim_id}</span> has already been analyzed.</p>
                <Button className="w-full border-[#34C759] text-[#34C759] hover:bg-[#34C759]/10 font-bold tracking-widest uppercase" variant="outline" onClick={() => setStatus("idle")}>
                  Acknowledge
                </Button>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generic Error Message Banner */}
      <AnimatePresence>
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-4 p-4 rounded-md border border-[#FF3B30]/50 bg-[#FF3B30]/10 text-[#FF3B30] flex items-center gap-3 glow-red"
          >
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </PageTransition>
  )
}
