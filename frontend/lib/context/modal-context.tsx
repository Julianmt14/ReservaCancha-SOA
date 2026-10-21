'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface ModalContextValue {
  openNewReserva: () => void
  isNewReservaOpen: boolean
  closeNewReserva: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isNewReservaOpen, setNewReserva] = useState(false)
  const openNewReserva = useCallback(() => setNewReserva(true), [])
  const closeNewReserva = useCallback(() => setNewReserva(false), [])

  return (
    <ModalContext.Provider value={{ openNewReserva, isNewReservaOpen, closeNewReserva }}>
      {children}
    </ModalContext.Provider>
  )
}

export function useModalContext() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModalContext must be used inside ModalProvider')
  return ctx
}
