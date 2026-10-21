import clsx from 'clsx'
import Link from 'next/link'

/** Marca tipográfica: RESERVA + CANCHA en lima (Anton). */
export default function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="ReservaCancha — inicio"
      className={clsx('text-display inline-flex items-baseline text-[24px] leading-none text-fg', className)}
    >
      Reserva<span className="text-accent-text">Cancha</span>
    </Link>
  )
}
