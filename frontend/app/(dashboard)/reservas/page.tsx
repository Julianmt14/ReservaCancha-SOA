'use client'

import { useAuth } from '@/lib/auth/context'
import MisReservasView from '@/components/app/reservas/MisReservasView'
import AdminReservasLoader from '@/components/app/reservas/AdminReservasLoader'

export default function ReservasPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  if (user?.role === 'JUGADOR') {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-6 pb-10 sm:px-6 lg:pt-10">
        <div>
          <p className="text-[15px] text-fg-2">Tus partidos, pagos y comprobantes.</p>
          <h1 className="text-display mt-2 text-[44px] text-fg sm:text-[64px]">
            Mis <span className="text-accent-text">reservas</span>
          </h1>
        </div>
        <MisReservasView />
      </div>
    )
  }

  return <AdminReservasLoader />
}
