'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { IconChevronDown, IconCheck, IconLogout, IconPlus } from '@/components/app/icons'
import { useAuth } from '@/lib/auth/context'
import { useBusiness } from '@/lib/context/business-context'
import ThemeToggle from '@/components/ui/ThemeToggle'
import Skeleton from '@/components/ui/Skeleton'
import { initials } from '@/lib/format'
import Logo from './Logo'
import { adminNavSections, playerNavSections, roleLabel, isActive } from './nav'

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
      <div className="mb-5 rounded-[14px] border border-line bg-surface p-3">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    )

  if (loadError)
    return (
      <button
        onClick={reload}
        className="mb-5 flex w-full items-center gap-2 rounded-[14px] border border-danger/40 bg-danger-soft px-3 py-3 text-left text-[12.5px] text-danger cursor-pointer"
      >
        Error al cargar — reintentar
      </button>
    )

  if (!activeBusiness) return null

  return (
    <div ref={ref} className="relative mb-5">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-[14px] border border-line bg-surface p-2.5 text-left transition-colors hover:border-line-2 cursor-pointer"
      >
        <span className="text-display grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent text-[15px] text-accent-ink">
          {activeBusiness.name.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-fg">{activeBusiness.name}</span>
          <span className="mt-0.5 block truncate text-[11.5px] text-fg-2">
            {activeBusiness.city} · {activeBusiness.department}
          </span>
        </span>
        <span className="shrink-0 text-fg-3">
          <IconChevronDown />
        </span>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-[14px] border border-line-2 bg-surface-3 py-1 shadow-pop">
          {businesses.map((b) => {
            const current = activeBusiness.id === b.id
            return (
              <button
                key={b.id}
                onClick={() => {
                  setActiveBusiness(b)
                  setOpen(false)
                }}
                className={clsx(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer',
                  current ? 'bg-surface-2 text-fg' : 'text-fg-2 hover:bg-surface-2'
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold">{b.name}</span>
                  <span className="block truncate text-[11px] text-fg-3">{b.city}</span>
                </span>
                {current && <IconCheck className="size-[14px] text-accent-text" />}
              </button>
            )
          })}
          <div className="my-1 h-px bg-line" />
          <Link
            href="/onboarding"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 text-[12.5px] font-medium text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <IconPlus />
            Crear nuevo complejo
          </Link>
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isLoading: authLoading, logout } = useAuth()
  const pathname = usePathname()

  const isPlayer = !authLoading && user?.role === 'JUGADOR'
  const navSections = authLoading ? [] : isPlayer ? playerNavSections : adminNavSections

  return (
    <div className="flex grow flex-col overflow-y-auto px-4 pt-6 pb-4">
      <div className="px-2 pb-7">
        <Logo />
      </div>

      {!isPlayer && <BusinessDropdown />}

      <nav className="flex flex-1 flex-col">
        {navSections.map((section) => (
          <div key={section.heading} className="mb-4">
            <div className="text-overline px-3 pb-2 text-fg-3">{section.heading}</div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const current = isActive(pathname, item.href)
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={current ? 'page' : undefined}
                      className={clsx(
                        'relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors',
                        current ? 'bg-surface-2 text-fg' : 'text-fg-2 hover:bg-surface hover:text-fg'
                      )}
                    >
                      {current && (
                        <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full bg-accent" />
                      )}
                      <span className={current ? 'text-accent-text' : 'text-fg-3'}>{item.icon}</span>
                      <span className="flex-1">{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {isPlayer && (
          <div className="mt-2 rounded-[18px] border border-line bg-surface p-4">
            <div className="text-overline text-accent-text">Reserva en línea</div>
            <p className="mt-2 text-[13px] leading-snug text-fg-2">
              Elige día y hora, paga con Nequi, PSE o tarjeta y comparte el partido por WhatsApp.
            </p>
          </div>
        )}

        <div className="mt-auto border-t border-line pt-4">
          <div className="flex items-center gap-3 px-1">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-[13px] font-bold text-fg ring-1 ring-line-2">
              {initials(user?.fullName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-fg">
                {user?.fullName ?? '—'}
              </span>
              <span className="block text-[11.5px] text-fg-3">
                {user?.role ? (roleLabel[user.role] ?? user.role) : '—'}
              </span>
            </span>
            <ThemeToggle className="size-9" />
            <button
              onClick={logout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="grid size-9 place-items-center rounded-full text-fg-3 transition-colors hover:bg-danger-soft hover:text-danger cursor-pointer"
            >
              <IconLogout className="size-[17px]" />
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
