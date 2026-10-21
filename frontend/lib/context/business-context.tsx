'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getMyBusinesses, type BusinessResponse } from '@/lib/api/businesses'
import { useAuth } from '@/lib/auth/context'

interface BusinessContextValue {
  businesses: BusinessResponse[]
  activeBusiness: BusinessResponse | null
  setActiveBusiness: (b: BusinessResponse) => void
  isLoading: boolean
  loadError: boolean
  reload: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextValue | null>(null)

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const [businesses, setBusinesses] = useState<BusinessResponse[]>([])
  const [activeBusiness, setActiveBusinessState] = useState<BusinessResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const isAdmin = !authLoading && user?.role !== 'JUGADOR' && user !== null

  const load = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setLoadError(false)
    try {
      const bs = await getMyBusinesses()
      setBusinesses(bs)
      setActiveBusinessState((prev) => {
        if (prev) return bs.find((b) => b.id === prev.id) ?? bs[0] ?? null
        return bs[0] ?? null
      })
    } catch (e) {
      console.error('[BusinessContext] getMyBusinesses failed:', e)
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  function setActiveBusiness(b: BusinessResponse) {
    setActiveBusinessState(b)
  }

  return (
    <BusinessContext.Provider
      value={{ businesses, activeBusiness, setActiveBusiness, isLoading, loadError, reload: load }}
    >
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness must be used inside BusinessProvider')
  return ctx
}
