'use client'

import { usePathname } from 'next/navigation'
import { IconSearch, IconBell, IconPlus } from '@/components/app/icons'
import { useAuth } from '@/lib/auth/context'
import { useBusiness } from '@/lib/context/business-context'
import { useModalContext } from '@/lib/context/modal-context'
import Button from '@/components/ui/Button'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { initials } from '@/lib/format'
import Logo from './Logo'
import { pageTitle } from './nav'

export default function Topbar({ onAccountClick }: { onAccountClick: () => void }) {
  const { user, isLoading: authLoading } = useAuth()
  const { activeBusiness } = useBusiness()
  const { openNewReserva } = useModalContext()
  const pathname = usePathname()
  const isPlayer = !authLoading && user?.role === 'JUGADOR'
  const title = pageTitle(pathname, isPlayer)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      {/* Móvil */}
      <div className="flex h-14 items-center gap-3 px-4 lg:hidden">
        <Logo className="text-[22px]" />
        <div className="flex-1" />
        {!isPlayer && (
          <Button size="sm" onClick={openNewReserva} aria-label="Nueva reserva" className="w-9 px-0">
            <IconPlus />
          </Button>
        )}
        <button
          onClick={onAccountClick}
          aria-label="Mi cuenta"
          className="grid size-9 place-items-center rounded-full bg-surface-2 text-[12px] font-bold text-fg ring-1 ring-line-2 cursor-pointer"
        >
          {initials(user?.fullName)}
        </button>
      </div>

      {/* Escritorio */}
      <div className="hidden h-16 items-center gap-4 px-8 lg:flex">
        <div className="flex min-w-0 items-center gap-2 text-[13px] text-fg-3">
          {!isPlayer && (
            <>
              <span className="truncate">{activeBusiness?.name ?? '—'}</span>
              <span>/</span>
            </>
          )}
          <span className="font-semibold text-fg">{title}</span>
        </div>

        <div className="flex-1" />

        {!isPlayer && (
          <label className="flex h-10 w-[300px] items-center gap-2 rounded-full border border-line bg-surface px-4 text-fg-2 transition-colors focus-within:border-accent-line">
            <IconSearch />
            <input
              placeholder="Buscar reserva, cliente, equipo…"
              className="flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-3"
            />
            <kbd className="rounded border border-line-2 px-1.5 text-[10.5px] text-fg-3">⌘K</kbd>
          </label>
        )}

        <button
          className="relative grid size-10 place-items-center rounded-full border border-line text-fg-2 transition-colors hover:border-line-2 hover:text-fg cursor-pointer"
          title="Notificaciones"
          aria-label="Notificaciones"
        >
          <IconBell />
          <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-accent ring-2 ring-bg" />
        </button>

        <ThemeToggle />

        {!isPlayer && (
          <Button onClick={openNewReserva} className="rounded-full px-5">
            <IconPlus />
            Nueva reserva
          </Button>
        )}
      </div>
    </header>
  )
}
