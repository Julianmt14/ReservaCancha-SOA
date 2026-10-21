'use client'

import { useAuth } from '@/lib/auth/context'
import MisReservasView from '@/components/app/reservas/MisReservasView'
import AdminReservasLoader from '@/components/app/reservas/AdminReservasLoader'

export default function ReservasPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  if (user?.role === 'JUGADOR') {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Mis reservas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Historial y estado de tus reservas.
          </p>
        </div>
        <MisReservasView />
      </div>
    )
  }

  return <AdminReservasLoader />
}
