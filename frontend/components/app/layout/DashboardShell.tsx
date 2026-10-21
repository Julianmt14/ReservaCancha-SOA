'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react'
import clsx from 'clsx'
import {
  IconDashboard,
  IconReservas,
  IconCanchas,
  IconTorneos,
  IconPagos,
  IconConfig,
  IconBars,
  IconClose,
  IconSearch,
  IconBell,
  IconHelp,
  IconPlus,
  IconChevronDown,
} from '@/components/app/icons'
import { useAuth } from '@/lib/auth/context'
import { useBusiness } from '@/lib/context/business-context'
import { useModalContext } from '@/lib/context/modal-context'
import CreateReservaModal from '@/components/app/reservas/CreateReservaModal'
import type { BookingResponse } from '@/lib/api/bookings'

type NavItem = { name: string; href: string; icon: React.ReactNode; badge?: string }
type NavSection = { heading: string; items: NavItem[] }

const adminNavSections: NavSection[] = [
  {
    heading: 'Operación',
    items: [
      { name: 'Dashboard', href: '/', icon: <IconDashboard /> },
      { name: 'Reservas', href: '/reservas', icon: <IconReservas /> },
      { name: 'Canchas', href: '/canchas', icon: <IconCanchas /> },
      { name: 'Torneos', href: '/torneos', icon: <IconTorneos /> },
      { name: 'Pagos', href: '/pagos', icon: <IconPagos /> },
    ],
  },
  {
    heading: 'Sistema',
    items: [{ name: 'Configuración', href: '#', icon: <IconConfig /> }],
  },
]

const playerNavSections: NavSection[] = [
  {
    heading: 'Explorar',
    items: [
      { name: 'Inicio', href: '/', icon: <IconDashboard /> },
      { name: 'Mis reservas', href: '/reservas', icon: <IconReservas /> },
    ],
  },
]

function BusinessDropdown() {
  const { businesses, activeBusiness, setActiveBusiness, isLoading, loadError, reload } = useBusiness()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  if (isLoading)
    return (
      <div
        className="mx-1 mb-[18px] rounded-[10px] px-3 py-[10px] animate-pulse"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
      >
        <div className="h-[13px] w-3/4 rounded" style={{ background: 'var(--panel-2)' }} />
        <div className="h-[11px] w-1/2 rounded mt-1.5" style={{ background: 'var(--panel-2)' }} />
      </div>
    )

  if (loadError)
    return (
      <button
        onClick={reload}
        className="w-full mx-1 mb-[18px] flex items-center gap-2 rounded-[10px] px-3 py-[10px] text-left cursor-pointer"
        style={{ background: 'var(--panel)', border: '1px solid rgba(229,72,77,0.3)' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--red)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-[12px]" style={{ color: 'var(--red)' }}>
          Error al cargar — reintentar
        </span>
      </button>
    )

  if (!activeBusiness) return null

  return (
    <div ref={ref} className="relative mx-1 mb-[18px]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-[10px] px-3 py-[10px] cursor-pointer text-left"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
      >
        <div className="min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>
            {activeBusiness.name}
          </div>
          <div className="text-[11px] mt-[2px] truncate" style={{ color: 'var(--text-3)' }}>
            {activeBusiness.city} · {activeBusiness.department}
          </div>
        </div>
        <span className="shrink-0 ml-2" style={{ color: 'var(--text-3)' }}>
          <IconChevronDown />
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden py-1"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line-2)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setActiveBusiness(b)
                setOpen(false)
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer"
              style={{
                background: activeBusiness.id === b.id ? 'var(--panel-2)' : 'transparent',
                color: activeBusiness.id === b.id ? 'var(--text)' : 'var(--text-2)',
              }}
              onMouseEnter={(e) => {
                if (activeBusiness.id !== b.id) e.currentTarget.style.background = 'var(--bg-2)'
              }}
              onMouseLeave={(e) => {
                if (activeBusiness.id !== b.id) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                className="size-7 rounded-lg shrink-0 grid place-items-center text-[11px] font-bold"
                style={{ background: 'rgba(27,158,75,0.15)', color: 'var(--green)' }}
              >
                {b.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold truncate">{b.name}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
                  {b.city}
                </div>
              </div>
              {activeBusiness.id === b.id && (
                <svg
                  className="shrink-0 ml-auto"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}

          <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />

          <a
            href="/onboarding"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              className="size-7 rounded-lg shrink-0 grid place-items-center"
              style={{
                background: 'var(--bg-2)',
                border: '1px dashed var(--line-2)',
                color: 'var(--text-3)',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span className="text-[12px] font-medium">Crear nuevo complejo</span>
          </a>
        </div>
      )}
    </div>
  )
}

function SidebarContent() {
  const { user, isLoading: authLoading, logout } = useAuth()
  const pathname = usePathname()

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?'

  const roleLabel: Record<string, string> = {
    ADMIN_CANCHA: 'Administrador',
    JUGADOR: 'Jugador',
    ORGANIZADOR: 'Organizador',
    SUPER_ADMIN: 'Super Admin',
  }

  const isPlayer = !authLoading && user?.role === 'JUGADOR'
  const navSections = authLoading ? [] : isPlayer ? playerNavSections : adminNavSections

  return (
    <div className="flex grow flex-col overflow-y-auto px-[14px] py-5">
      {/* Logo */}
      <div className="flex items-center gap-[10px] px-2 pb-[22px]">
        <div
          className="grid place-items-center size-8 rounded-lg shrink-0"
          style={{
            background: 'linear-gradient(135deg,var(--green),var(--green-deep))',
            boxShadow: '0 6px 18px rgba(27,158,75,0.35)',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3 L14 8 L12 12 L10 8 Z" fill="white" />
            <path d="M3 12 L8 10 L12 12 L8 14 Z" />
            <path d="M21 12 L16 10 L12 12 L16 14 Z" />
          </svg>
        </div>
        <span className="font-extrabold text-[15.5px] tracking-[-0.025em] text-text">
          Reserva<span className="text-brand">Cancha</span>
        </span>
      </div>

      {/* Business dropdown — only for admin */}
      {!isPlayer && <BusinessDropdown />}

      {/* Nav */}
      <nav className="flex flex-1 flex-col">
        {navSections.map((section) => (
          <div key={section.heading} className="mb-2">
            <div className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-3">
              {section.heading}
            </div>
            <ul className="space-y-[2px]">
              {section.items.map((item) => {
                const current = pathname === item.href
                return (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13.5px] font-medium transition-colors cursor-pointer',
                        current ? 'text-white' : 'text-text-2 hover:text-white'
                      )}
                      style={
                        current
                          ? {
                              background: 'linear-gradient(180deg,rgba(27,158,75,0.22),rgba(27,158,75,0.10))',
                              boxShadow: 'inset 0 0 0 1px rgba(27,158,75,0.35)',
                            }
                          : undefined
                      }
                    >
                      <span className={current ? 'text-brand' : 'inherit'}>{item.icon}</span>
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span
                          className={clsx(
                            'text-[10.5px] font-bold px-[7px] py-[2px] rounded-full text-white font-mono',
                            current ? 'bg-white/18' : 'bg-brand'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {/* User card */}
        <div className="mt-auto pt-[14px] border-t border-line">
          <div className="flex items-center gap-[10px] p-2 rounded-lg">
            <div
              className="size-[34px] rounded-full shrink-0 grid place-items-center text-[13px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#4C8DF5,#1B9E4B)' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-text truncate">{user?.fullName ?? '—'}</div>
              <div className="text-[11px] text-text-3">
                {user?.role ? (roleLabel[user.role] ?? user.role) : '—'}
              </div>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="text-text-3 hover:text-red-400 transition-colors p-1 rounded cursor-pointer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, isLoading: authLoading } = useAuth()
  const { activeBusiness } = useBusiness()
  const { openNewReserva } = useModalContext()
  const isPlayer = !authLoading && user?.role === 'JUGADOR'

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-[18px] px-7 bg-bg border-b border-line">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-1 rounded-md text-text-2 cursor-pointer"
      >
        <span className="sr-only">Abrir menú</span>
        <IconBars />
      </button>

      <div className="flex items-center gap-2 text-[13px] text-text-3">
        {isPlayer ? (
          <span className="font-semibold text-text">Canchas disponibles</span>
        ) : (
          <>
            <span>{activeBusiness?.name ?? '—'}</span>
            <span>/</span>
            <span className="font-semibold text-text">Dashboard</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 px-3 py-[7px] rounded-lg w-[280px] bg-panel border border-line text-text-2">
        <IconSearch />
        <input
          placeholder="Buscar reserva, cliente, equipo…"
          className="flex-1 bg-transparent border-0 outline-none text-[13px] text-text placeholder:text-text-3"
        />
        <span className="text-[10.5px] px-[6px] py-[1px] rounded border border-line-2 text-text-3">⌘K</span>
      </div>

      <button
        className="relative size-9 rounded-lg grid place-items-center bg-panel border border-line text-text-2 cursor-pointer"
        title="Notificaciones"
      >
        <IconBell />
        <span
          className="absolute top-[7px] right-[8px] size-2 rounded-full bg-brand"
          style={{ boxShadow: '0 0 0 2px var(--bg)' }}
        />
      </button>

      <button
        className="size-9 rounded-lg grid place-items-center bg-panel border border-line text-text-2 cursor-pointer"
        title="Ayuda"
      >
        <IconHelp />
      </button>

      {!isPlayer && (
        <button
          onClick={openNewReserva}
          className="inline-flex items-center gap-2 px-[14px] py-[9px] rounded-lg text-[13px] font-semibold text-white bg-brand cursor-pointer"
          style={{ boxShadow: '0 6px 18px rgba(27,158,75,0.30),inset 0 1px 0 rgba(255,255,255,0.15)' }}
        >
          <IconPlus />
          Nueva reserva
        </button>
      )}
    </div>
  )
}

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

  if (loading) return <div className="min-h-screen" style={{ background: 'var(--bg)' }} />
  if (needsOnboarding) return null

  return <>{children}</>
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth()
  const { isNewReservaOpen, closeNewReserva } = useModalContext()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading) return <div className="min-h-screen" style={{ background: 'var(--bg)' }} />

  return (
    <OnboardingGuard>
      <div className="flex min-h-screen bg-bg">
        {/* Mobile sidebar */}
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-black/50 transition-opacity duration-300 ease-linear data-closed:opacity-0"
          />
          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative flex w-full max-w-[240px] flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full bg-sidebar border-r border-line"
            >
              <TransitionChild>
                <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="p-2.5 text-text-2 cursor-pointer"
                  >
                    <span className="sr-only">Cerrar menú</span>
                    <IconClose />
                  </button>
                </div>
              </TransitionChild>
              <SidebarContent />
            </DialogPanel>
          </div>
        </Dialog>

        {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-60 lg:flex-col bg-sidebar border-r border-line">
          <SidebarContent />
        </div>

        {/* Main */}
        <div className="flex flex-1 flex-col lg:pl-60">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex flex-col flex-1">{children}</main>
        </div>

        <CreateReservaModal
          open={isNewReservaOpen}
          onClose={closeNewReserva}
          onSaved={(_b: BookingResponse) => {
            closeNewReserva()
          }}
        />
      </div>
    </OnboardingGuard>
  )
}
