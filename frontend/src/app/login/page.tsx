"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ShieldAlert, Mail, Lock, User, Loader2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoggedIn } = useAuthStore()

  const [mode, setMode] = React.useState<"login" | "register">("login")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isLoggedIn) router.push("/")
  }, [isLoggedIn, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === "register") {
        const res = await fetch("http://127.0.0.1:8000/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, full_name: fullName }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || "Registration failed")
        setSuccess("Account created! Switching to login...")
        setTimeout(() => { setMode("login"); setSuccess(null) }, 1500)
      } else {
        const res = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || "Login failed")
        login(data.access_token, {
          email: data.user_email,
          role: data.user_role,
          name: data.user_name,
        })
        router.push("/")
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-32 w-32 items-center justify-center rounded-2xl bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/30 glow-accent mb-6 overflow-hidden p-4">
            <img src="/logo.png" alt="Claim Hawk Logo" className="w-full h-full object-contain" onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }} />
            <ShieldAlert size={48} className="text-[var(--accent-color)] hidden" />
          </div>
          <h1 className="text-4xl font-black tracking-[0.2em] text-[var(--text-primary)] font-[family-name:var(--font-outfit)] uppercase">CLAIM HAWK</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Claim Hawk Intelligence Console</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-xl p-8 shadow-2xl">
          {/* Mode Toggle */}
          <div className="flex mb-6 rounded-lg bg-[var(--text-primary)]/5 p-1 border border-[var(--border-color)]">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${mode === "login" ? "bg-[var(--accent-color)] text-white shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${mode === "register" ? "bg-[var(--accent-color)] text-white shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] block mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. John Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] block mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@claimhawk.gov.in"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] block mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] text-sm">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#34C759]/10 border border-[#34C759]/30 text-[#34C759] text-sm">
                ✓ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-color)]/80 text-white text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-accent"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              Secured with JWT · BCrypt · RBAC
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
