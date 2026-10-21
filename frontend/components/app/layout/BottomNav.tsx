'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  IconCompass,
  IconTicket,
  IconUser,
  IconDashboard,
  IconReservas,
  IconCanchas,
  IconMore,
} from '@/components/app/icons'
import { isActive } from './nav'

type Item = { name: string; href?: string; icon: React.ReactNode; onClick?: () => void }

/**
 * Navegación inferior en móvil (vidrio sobre el contenido).
 * Jugador: Explorar · Mis reservas · Cuenta. Dueño: Inicio · Reservas · Canchas · Más.
 */
export default function BottomNav({
  isPlayer,
  onAccount,
  onMore,
}: {
  isPlayer: boolean
  onAccount: () => void
  onMore: () => void
}) {
  const pathname = usePathname()

  const items: Item[] = isPlayer
    ? [
        { name: 'Explorar', href: '/', icon: <IconCompass className="size-[22px]" /> },
        { name: 'Mis reservas', href: '/reservas', icon: <IconTicket className="size-[22px]" /> },
        { name: 'Cuenta', icon: <IconUser className="size-[22px]" />, onClick: onAccount },
      ]
    : [
        { name: 'Inicio', href: '/', icon: <IconDashboard /> },
        { name: 'Reservas', href: '/reservas', icon: <IconReservas /> },
        { name: 'Canchas', href: '/canchas', icon: <IconCanchas /> },
        { name: 'Más', icon: <IconMore className="size-[22px]" />, onClick: onMore },
      ]

  return (
    <nav
      aria-label="Navegación principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch">
        {items.map((item) => {
          const current = item.href ? isActive(pathname, item.href) : false
          const inner = (
            <>
              <span
                className={clsx(
                  'grid h-7 w-12 place-items-center rounded-full transition-colors',
                  current ? 'bg-accent text-accent-ink' : 'text-fg-2'
                )}
              >
                {item.icon}
              </span>
              <span className={clsx('text-[11px] font-medium', current ? 'text-fg' : 'text-fg-3')}>
                {item.name}
              </span>
            </>
          )
          const cls = 'flex h-full w-full flex-col items-center justify-center gap-1 cursor-pointer'
          return (
            <li key={item.name} className="flex-1">
              {item.href ? (
                <Link href={item.href} aria-current={current ? 'page' : undefined} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={item.onClick} className={cls}>
                  {inner}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
