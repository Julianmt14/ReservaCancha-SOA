'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  login as apiLogin,
  saveSession,
  clearSession,
  getStoredUser,
  type LoginRequest,
  type AuthResponse,
} from '@/lib/api/auth'

interface AuthContextValue {
  user: AuthResponse | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setUser(getStoredUser())
    setIsLoading(false)
  }, [])

  const login = useCallback(
    async (data: LoginRequest) => {
      const auth = await apiLogin(data)
      saveSession(auth)
      setUser(auth)
      router.push('/')
    },
    [router]
  )

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    router.push('/login')
  }, [router])

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
