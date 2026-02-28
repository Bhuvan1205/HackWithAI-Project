import { create } from 'zustand'

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'ALL'
export type FraudPattern = 'PHANTOM' | 'UPCODING' | 'REPEAT_ABUSE' | 'MIXED' | 'NONE' | 'ALL'

export interface IntelligenceResponse {
  claim_id: string
  hospital_name?: string
  patient_name?: string
  anomaly_score_norm: number
  rule_score_norm: number
  final_risk_score: number
  risk_level: "LOW" | "MEDIUM" | "HIGH"
  threat_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  composite_index?: number
  confidence_score?: number
  enforcement_state?: string
  hard_stop?: boolean
  risk_breakdown: {
    rule_contribution_percent: number
    anomaly_contribution_percent: number
  }
  rule_triggers: {
    zero_day_inpatient: boolean
    high_amount_zscore: boolean
    repeat_procedure_flag: boolean
    near_package_ceiling: boolean
    high_patient_frequency: boolean
  }
  fraud_pattern_detected: "PHANTOM" | "UPCODING" | "REPEAT_ABUSE" | "MIXED" | "NONE"
  investigation_priority: "AUTO_APPROVE" | "REVIEW" | "ESCALATE"
  explanation: string
  feature_values?: Record<string, any>
}

interface AppState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  backendStatus: 'ok' | 'degraded' | 'error' | 'loading'
  setBackendStatus: (status: 'ok' | 'degraded' | 'error' | 'loading') => void
  activeHighRiskAlert: boolean
  setActiveHighRiskAlert: (active: boolean) => void
  latestIntelligenceResult: IntelligenceResponse | null
  setLatestIntelligenceResult: (result: IntelligenceResponse | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  backendStatus: 'loading',
  setBackendStatus: (status) => set({ backendStatus: status }),
  activeHighRiskAlert: false,
  setActiveHighRiskAlert: (active) => set({ activeHighRiskAlert: active }),
  latestIntelligenceResult: null,
  setLatestIntelligenceResult: (result) => set({ latestIntelligenceResult: result }),
}))
