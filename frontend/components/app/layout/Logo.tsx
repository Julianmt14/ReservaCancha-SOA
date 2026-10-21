import clsx from 'clsx'
import Link from 'next/link'

/**
 * Marca «Tu turno»: la cancha vista desde arriba con un reloj en el círculo central.
 * Los colores salen de --logo-line y --logo-hands, así se adapta a fondo claro, oscuro o verde.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={clsx('shrink-0', className)}>
      <rect
        x="4.5"
        y="13.5"
        width="55"
        height="37"
        rx="7"
        fill="none"
        stroke="var(--logo-line)"
        strokeWidth="3.2"
      />
      <path
        d="M32 13.5V50.5M4.5 25.5H10V38.5H4.5M59.5 25.5H54V38.5H59.5"
        fill="none"
        stroke="var(--logo-line)"
        strokeWidth="3.2"
      />
      <circle cx="32" cy="32" r="12.5" fill="var(--logo-line)" />
      <path d="M32 32V24M32 32L25.6 35.7" stroke="var(--logo-hands)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** Marca completa: símbolo + «reserva» (500) «cancha» (800). */
export default function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="ReservaCancha — inicio"
      className={clsx(
        'inline-flex items-center gap-2.5 text-[21px] leading-none tracking-[-0.025em] text-fg',
        className
      )}
    >
      <LogoMark className="size-[1.6em]" />
      <span>
        <span className="font-medium">reserva</span>
        <b className="font-extrabold">cancha</b>
      </span>
    </Link>
  )
}
