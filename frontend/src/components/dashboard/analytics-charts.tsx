"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts"
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
      <div className="bg-slate-900/90 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-slate-300 text-xs mb-2 tracking-wider font-semibold">{label}</p>
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
  return (
    <Card className="h-[350px] flex flex-col glow-blue hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-500">
      <CardHeader>
        <CardTitle className="text-sm tracking-widest uppercase text-slate-400">Claim Volume Timeline</CardTitle>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="claims" name="Total Claims" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorClaims)" />
            <Area type="monotone" dataKey="anomalies" name="Flagged Anomalies" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorAnomalies)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function RiskDistributionChart() {
  return (
    <Card className="h-[350px] flex flex-col glow-amber hover:shadow-[0_0_20px_rgba(255,159,10,0.1)] transition-all duration-500">
      <CardHeader>
        <CardTitle className="text-sm tracking-widest uppercase text-slate-400">Risk Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={riskDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: '#ffffff10' }} content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {riskDistributionData.map((entry, index) => (
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
  return (
    <Card className="h-[350px] flex flex-col glow-red hover:shadow-[0_0_20px_rgba(255,59,48,0.1)] transition-all duration-500">
      <CardHeader>
        <CardTitle className="text-sm tracking-widest uppercase text-slate-400">Threat Radar Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-6 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="w-[80%] h-[80%] border border-[#FF3B30] rounded-full animate-[ping_3s_ease-in-out_infinite]" />
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#ffffff20" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Threat Level" dataKey="A" stroke="#FF3B30" strokeWidth={2} fill="#FF3B30" fillOpacity={0.3} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
