import {
  IconDashboard,
  IconReservas,
  IconCanchas,
  IconTorneos,
  IconPagos,
  IconConfig,
  IconCompass,
  IconTicket,
} from '@/components/app/icons'

export type NavItem = { name: string; short?: string; href: string; icon: React.ReactNode }
export type NavSection = { heading: string; items: NavItem[] }

export const adminNavSections: NavSection[] = [
  {
    heading: 'Operación',
    items: [
      { name: 'Dashboard', short: 'Inicio', href: '/', icon: <IconDashboard /> },
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

export const playerNavSections: NavSection[] = [
  {
    heading: 'Jugar',
    items: [
      { name: 'Explorar', href: '/', icon: <IconCompass /> },
      { name: 'Mis reservas', href: '/reservas', icon: <IconTicket /> },
    ],
  },
]

export const roleLabel: Record<string, string> = {
  ADMIN_CANCHA: 'Administrador',
  JUGADOR: 'Jugador',
  ORGANIZADOR: 'Organizador',
  SUPER_ADMIN: 'Super Admin',
}

/** Título de la página actual para la barra superior. */
export function pageTitle(pathname: string, isPlayer: boolean): string {
  if (pathname === '/') return isPlayer ? 'Explorar' : 'Dashboard'
  if (pathname.startsWith('/reservas')) return isPlayer ? 'Mis reservas' : 'Reservas'
  if (pathname.startsWith('/canchas')) return 'Canchas'
  if (pathname.startsWith('/torneos')) return 'Torneos'
  if (pathname.startsWith('/pagos')) return 'Pagos'
  return ''
}

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return href !== '#' && pathname.startsWith(href)
}
