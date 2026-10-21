'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { IconClose } from '@/components/app/icons'
import { useAuth } from '@/lib/auth/context'
import { useBusiness } from '@/lib/context/business-context'
import { useModalContext } from '@/lib/context/modal-context'
import CreateReservaModal from '@/components/app/reservas/CreateReservaModal'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'
import AccountSheet from './AccountSheet'

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const { businesses, isLoading: bizLoading, loadError } = useBusiness()
  const router = useRouter()
  const pathname = usePathname()

  const isAdmin = !authLoading && user !== null && user.role !== 'JUGADOR'
  const loading = authLoading || (isAdmin && bizLoading)
  // Solo redirige si la carga fue exitosa (sin error) y el array está vacío
  const needsOnboarding = isAdmin && !bizLoading && !loadError && businesses.length === 0

  useEffect(() => {
    if (!loading && needsOnboarding && pathname !== '/onboarding') {
      router.replace('/onboarding')
    }
  }, [loading, needsOnboarding, pathname, router])

  if (loading) return <div className="min-h-screen bg-bg" />
  if (needsOnboarding) return null

  return <>{children}</>
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const { isNewReservaOpen, closeNewReserva } = useModalContext()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  if (isLoading) return <div className="min-h-screen bg-bg" />

  const isPlayer = user?.role === 'JUGADOR'

  return (
    <OnboardingGuard>
      <div className="flex min-h-screen bg-bg">
        {/* Menú lateral en móvil ("Más" del dueño) */}
        <Dialog open={drawerOpen} onClose={setDrawerOpen} className="relative z-50 lg:hidden">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-scrim backdrop-blur-sm transition-opacity duration-300 ease-out data-closed:opacity-0"
          />
          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative flex w-full max-w-[280px] flex-1 transform border-r border-line bg-bg-2 transition duration-300 ease-out data-closed:-translate-x-full"
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-3 grid size-9 place-items-center rounded-full text-fg-2 hover:bg-surface-2 cursor-pointer"
              >
                <span className="sr-only">Cerrar menú</span>
                <IconClose />
              </button>
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </DialogPanel>
          </div>
        </Dialog>

        {/* Barra lateral en escritorio */}
        <aside className="hidden border-r border-line bg-bg-2 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
          <Sidebar />
        </aside>

        {/* Contenido */}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <Topbar onAccountClick={() => setAccountOpen(true)} />
          <main className="flex flex-1 flex-col pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">
            {children}
          </main>
        </div>

        <BottomNav
          isPlayer={isPlayer}
          onAccount={() => setAccountOpen(true)}
          onMore={() => setDrawerOpen(true)}
        />
        <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />

        {!isPlayer && (
          <CreateReservaModal
            open={isNewReservaOpen}
            onClose={closeNewReserva}
            onSaved={() => closeNewReserva()}
          />
        )}
      </div>
    </OnboardingGuard>
  )
}
