"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number // positive, negative, zero
  trendLabel?: string
  accentColor?: "blue" | "green" | "red" | "amber" | "violet"
  delay?: number
}

const colorMap = {
  blue: "from-blue-500/20 to-transparent border-blue-500/50 text-blue-500",
  green: "from-[#34C759]/20 to-transparent border-[#34C759]/50 text-[#34C759]",
  red: "from-[#FF3B30]/20 to-transparent border-[#FF3B30]/50 text-[#FF3B30]",
  amber: "from-[#FF9F0A]/20 to-transparent border-[#FF9F0A]/50 text-[#FF9F0A]",
  violet: "from-accent/20 to-transparent border-accent/50 text-accent",
}

const glowMap = {
  blue: "hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]",
  green: "hover:shadow-[0_0_20px_rgba(52,199,89,0.3)]",
  red: "hover:shadow-[0_0_20px_rgba(255,59,48,0.3)]",
  amber: "hover:shadow-[0_0_20px_rgba(255,159,10,0.3)]",
  violet: "hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]",
}

export function KPICard({
  title, value, icon: Icon, trend, trendLabel, accentColor = "blue", delay = 0
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card className={cn(
        "relative overflow-hidden group h-full cursor-default border-t-[3px] transition-all duration-300",
        glowMap[accentColor]
      )}
        style={{ borderTopColor: accentColor === 'red' ? '#FF3B30' : accentColor === 'amber' ? '#FF9F0A' : accentColor === 'green' ? '#34C759' : accentColor === 'violet' ? '#7C3AED' : '#3B82F6' }}>

        {/* Subtle background gradient based on accent color */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          colorMap[accentColor].split(" ")[0], colorMap[accentColor].split(" ")[1]
        )} />

        <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium tracking-widest text-slate-400 uppercase">
              {title}
            </p>
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded bg-slate-800/50 border border-white/5",
              colorMap[accentColor].split(" ").pop()
            )}>
              <Icon size={16} />
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {value}
            </h2>
          </div>

          <div className="mt-4 flex items-center text-xs">
            {trend !== undefined && (
              <span className={cn(
                "flex items-center gap-1 font-medium",
                trend > 0 ? "text-destructive" : trend < 0 ? "text-success" : "text-slate-400"
              )}>
                {trend > 0 ? <ArrowUpRight size={14} /> : trend < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                {Math.abs(trend)}%
              </span>
            )}
            {trendLabel && <span className="text-slate-500 ml-2">{trendLabel}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
