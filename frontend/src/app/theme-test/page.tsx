"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Activity, ShieldAlert, FileText, CheckCircle2 } from "lucide-react"

export default function ThemeTestPage() {
 return (
  <div className="p-8 max-w-5xl mx-auto space-y-12">
   <div className="flex justify-between items-end border-b border-[var(--border-color)] pb-4">
    <div>
     <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] uppercase flex items-center gap-3">
      <Activity className="text-[var(--accent-color)]" size={28} />
      Theme Calibration Matrix
     </h1>
     <p className="text-[var(--text-secondary)] mt-1">Design system validation environment.</p>
    </div>
    <ThemeToggle />
   </div>

   <section className="space-y-4">
    <h2 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest border-l-4 border-[var(--accent-color)] pl-3">Color Tokens Reference</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
     <div className="p-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
      <p className="text-xs text-[var(--text-secondary)] font-mono mb-2">--bg-primary</p>
      <div className="h-10 w-full rounded bg-[var(--bg-primary)] border border-[var(--border-color)]"></div>
     </div>
     <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
      <p className="text-xs text-[var(--text-secondary)] font-mono mb-2">--bg-secondary</p>
      <div className="h-10 w-full rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]"></div>
     </div>
     <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
      <p className="text-xs text-[var(--text-secondary)] font-mono mb-2">--accent-color</p>
      <div className="h-10 w-full rounded bg-[var(--accent-color)] shadow-[0_0_15px_var(--accent-color)]"></div>
     </div>
     <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
      <p className="text-xs text-[var(--text-secondary)] font-mono mb-2">--intel-danger</p>
      <div className="h-10 w-full rounded bg-[var(--intel-danger)] shadow-[0_0_15px_var(--intel-danger)]"></div>
     </div>
    </div>
   </section>

   <section className="space-y-4">
    <h2 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest border-l-4 border-[var(--accent-color)] pl-3">Typography & Inputs</h2>
    <Card variant="default">
     <CardContent className="p-6 space-y-6">
      <div>
       <h1 className="text-4xl font-black text-[var(--text-primary)]">Heading H1</h1>
       <h2 className="text-3xl font-bold text-[var(--text-primary)]">Heading H2</h2>
       <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Heading H3</h3>
       <p className="text-[var(--text-secondary)] mt-2 leading-relaxed">
        Primary body text using <code className="text-[var(--accent-color)] bg-[var(--text-primary)]/5 px-1 py-0.5 rounded">--text-secondary</code>.
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
       </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--text-primary)]">Standard Input</label>
        <Input placeholder="Enter diagnostic query..." />
       </div>
       <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--text-primary)]">Disabled Input</label>
        <Input placeholder="Restricted access" disabled />
       </div>
      </div>
     </CardContent>
    </Card>
   </section>

   <section className="space-y-4">
    <h2 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest border-l-4 border-[var(--accent-color)] pl-3">Component Specimens</h2>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
     <Card variant="glass">
      <CardHeader>
       <CardTitle className="flex items-center gap-2">
        <ShieldAlert className="text-[var(--intel-danger)]" size={18} /> Alert Card
       </CardTitle>
      </CardHeader>
      <CardContent>
       <p className="text-sm text-[var(--text-secondary)] mb-4">Critical severity detected in telemetry packet.</p>
       <Badge variant="highRisk">CRITICAL</Badge>
      </CardContent>
      <CardFooter className="bg-[var(--text-primary)]/5 border-t border-[var(--border-color)]">
       <Button variant="outline" size="sm" className="w-full">Isolate</Button>
      </CardFooter>
     </Card>

     <Card variant="default">
      <CardHeader>
       <CardTitle className="flex items-center gap-2">
        <CheckCircle2 className="text-[var(--intel-primary)]" size={18} /> Status Nominal
       </CardTitle>
      </CardHeader>
      <CardContent>
       <p className="text-sm text-[var(--text-secondary)] mb-4">All systems operating within acceptable parameters.</p>
       <Badge variant="success">OK</Badge>
      </CardContent>
      <CardFooter className="bg-[var(--text-primary)]/5 border-t border-[var(--border-color)]">
       <Button size="sm" className="w-full">Acknowledge</Button>
      </CardFooter>
     </Card>

     <Card variant="glass">
      <CardHeader>
       <CardTitle className="flex items-center gap-2">
        <FileText className="text-[var(--accent-color)]" size={18} /> Report Draft
       </CardTitle>
      </CardHeader>
      <CardContent>
       <p className="text-sm text-[var(--text-secondary)] mb-4">Review pending analysis matrix.</p>
       <Badge variant="warning">PENDING</Badge>
      </CardContent>
      <CardFooter className="bg-[var(--text-primary)]/5 border-t border-[var(--border-color)]">
       <Button variant="secondary" size="sm" className="w-full">Review</Button>
      </CardFooter>
     </Card>
    </div>
   </section>

  </div>
 )
}
