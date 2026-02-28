"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts"
import { useTheme } from "next-themes"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

const volumeData = [
  { name: '00:00', claims: 45, anomalies: 2 },
  { name: '04:00', claims: 20, anomalies: 1 },
  { name: '08:00', claims: 150, anomalies: 10 },
  { name: '12:00', claims: 280, anomalies: 24 },
  { name: '16:00', claims: 210, anomalies: 15 },
  { name: '20:00', claims: 90, anomalies: 8 },
  { name: '24:00', claims: 40, anomalies: 3 },
]

const riskDistributionData = [
  { name: 'Low Risk', value: 75, color: '#34C759' },
  { name: 'Medium Risk', value: 15, color: '#FF9F0A' },
  { name: 'High Risk', value: 8, color: '#FF3B30' },
  { name: 'Critical Risk', value: 2, color: '#7C3AED' },
]

const radarData = [
  { subject: 'Phantom Billing', A: 85, fullMark: 100 },
  { subject: 'Upcoding', A: 65, fullMark: 100 },
  { subject: 'Repeat Abuse', A: 40, fullMark: 100 },
  { subject: 'Identity Theft', A: 20, fullMark: 100 },
  { subject: 'Unnecessary Proc.', A: 50, fullMark: 100 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-secondary)]/90 border border-[var(--border-color)] p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-[var(--text-primary)] text-xs mb-2 tracking-wider font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function ClaimVolumeChart() {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark" || !currentTheme;
  const gridColor = isDark ? "#ffffff10" : "#e2e8f0";
  const axisColor = isDark ? "#ffffff40" : "#94a3b8";

  return (
    <Card className="h-[350px] flex flex-col glow-blue hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-500">
      <CardHeader>
        <CardTitle className="text-sm tracking-widest uppercase text-[var(--text-secondary)]">Claim Volume Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClaims" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: gridColor, strokeWidth: 1 }} />
            <Area type="monotone" dataKey="claims" name="Total Claims" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorClaims)" />
            <Area type="monotone" dataKey="anomalies" name="Flagged Anomalies" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorAnomalies)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function RiskDistributionChart({ data, loading }: { data?: any, loading?: boolean }) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark" || !currentTheme;
  const gridColor = isDark ? "#ffffff10" : "#e2e8f0";
  const axisColor = isDark ? "#ffffff40" : "#94a3b8";

  const chartData = loading || !data ? riskDistributionData : [
    { name: 'Low', value: data.LOW || 0, color: '#34C759' },
    { name: 'Medium', value: data.MEDIUM || 0, color: '#FF9F0A' },
    { name: 'High', value: data.HIGH || 0, color: '#FF3B30' },
    { name: 'Critical', value: data.CRITICAL || 0, color: '#7C3AED' },
  ]

  return (
    <Card className="h-[350px] flex flex-col glow-amber hover:shadow-[0_0_20px_rgba(255,159,10,0.1)] transition-all duration-500">
      <CardHeader>
        <CardTitle className="text-sm tracking-widest uppercase text-[var(--text-secondary)]">Risk Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: gridColor }} content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function FraudRadarChart() {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark" || !currentTheme;
  const gridColor = isDark ? "#ffffff20" : "#cbd5e1";
  const labelColor = isDark ? "#94a3b8" : "#475569";

  return (
    <Card className="h-[350px] flex flex-col glow-red hover:shadow-[0_0_20px_rgba(255,59,48,0.1)] transition-all duration-500">
      <CardHeader>
        <CardTitle className="text-sm tracking-widest uppercase text-[var(--text-secondary)]">Threat Radar Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-6 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="w-[80%] h-[80%] border border-[var(--intel-danger)] rounded-full animate-[ping_3s_ease-in-out_infinite]" />
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: labelColor, fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Threat Level" dataKey="A" stroke="var(--intel-danger)" strokeWidth={2} fill="var(--intel-danger)" fillOpacity={0.3} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
