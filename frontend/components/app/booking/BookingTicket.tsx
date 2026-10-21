import clsx from 'clsx'
import type { BookingResponse } from '@/lib/api/bookings'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCOP, formatDayLong, formatDuration, formatHour, hourOf } from '@/lib/format'

interface Props {
  booking: BookingResponse
  venueName: string
  total?: number | null
  /** Texto sobre el título ("Tu próximo partido", "Juegas en 3 h"). */
  eyebrow?: React.ReactNode
  /** Color de los recortes laterales: debe coincidir con el fondo sobre el que va el ticket. */
  cutout?: 'bg' | 'surface'
  className?: string
  children?: React.ReactNode
}

/** Tarjeta-ticket de una reserva: cancha en grande, fecha y hora en mono, código y total. */
export default function BookingTicket({
  booking,
  venueName,
  total,
  eyebrow,
  cutout = 'bg',
  className,
  children,
}: Props) {
  const start = hourOf(booking.startAt)
  const end = hourOf(booking.endAt)
  const day = formatDayLong(booking.startAt.slice(0, 10))
  const cut = cutout === 'bg' ? 'bg-bg' : 'bg-surface'
  const cancelled = booking.status === 'CANCELLED'

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-[24px] border border-line-2 bg-surface-2 shadow-card',
        cancelled && 'opacity-70',
        className
      )}
    >
      <div className="pointer-events-none absolute -top-24 -right-16 size-56 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        <div className="text-overline leading-snug text-fg-2">{eyebrow ?? venueName}</div>
        <h3 className="text-display mt-3 text-[34px] text-fg sm:text-[40px]">{booking.courtName}</h3>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <div className="text-[14px] font-medium text-fg-2 first-letter:uppercase">{day}</div>
            <div
              className={clsx(
                'num mt-1.5 text-[30px] leading-none font-semibold text-fg',
                cancelled && 'line-through'
              )}
            >
              {formatHour(start)}
              <span className="mx-1 text-fg-3">–</span>
              {formatHour(end)}
            </div>
          </div>
          <span className="rounded-full border border-line-2 px-3 py-1 text-[12.5px] font-medium text-fg-2">
            {formatDuration(end - start)}
          </span>
        </div>
      </div>

      <div className="relative mx-5 border-t border-dashed border-line-2">
        <span className={clsx('absolute -top-3 -left-8 size-6 rounded-full border border-line-2', cut)} />
        <span className={clsx('absolute -top-3 -right-8 size-6 rounded-full border border-line-2', cut)} />
      </div>

      <div className="relative flex items-end justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="text-overline text-fg-3">Código</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="num text-[15px] font-semibold text-fg">{booking.bookingCode}</span>
            <StatusBadge status={booking.status} />
          </div>
        </div>
        {total != null && (
          <div className="text-right">
            <div className="text-overline text-fg-3">Total</div>
            <div className="num mt-1 text-[20px] font-semibold text-fg">{formatCOP(total)}</div>
          </div>
        )}
      </div>

      {children && <div className="relative border-t border-line px-3 py-3 sm:px-4">{children}</div>}
    </div>
  )
}
