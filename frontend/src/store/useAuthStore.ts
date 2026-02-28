import { create } from 'zustand'

interface AuthUser {
 email: string
 role: string
 name: string
 id?: number
}

interface AuthState {
 token: string | null
 user: AuthUser | null
 isLoggedIn: boolean
 login: (token: string, user: AuthUser) => void
 logout: () => void
 loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
 token: null,
 user: null,
 isLoggedIn: false,

 login: (token, user) => {
  localStorage.setItem('pmjay_token', token)
  localStorage.setItem('pmjay_user', JSON.stringify(user))
  set({ token, user, isLoggedIn: true })
 },

 logout: () => {
  localStorage.removeItem('pmjay_token')
  localStorage.removeItem('pmjay_user')
  set({ token: null, user: null, isLoggedIn: false })
 },

 loadFromStorage: () => {
  const token = localStorage.getItem('pmjay_token')
  const userStr = localStorage.getItem('pmjay_user')
  if (token && userStr) {
   try {
    const user = JSON.parse(userStr)
    set({ token, user, isLoggedIn: true })
   } catch {
    localStorage.removeItem('pmjay_token')
    localStorage.removeItem('pmjay_user')
   }
  }
 },
}))
