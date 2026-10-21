'use client'

import { useAuth } from '@/lib/auth/context'
import MisReservasView from '@/components/app/reservas/MisReservasView'
import AdminReservasLoader from '@/components/app/reservas/AdminReservasLoader'

export default function ReservasPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  if (user?.role === 'JUGADOR') return <MisReservasView />

  return <AdminReservasLoader />
}
