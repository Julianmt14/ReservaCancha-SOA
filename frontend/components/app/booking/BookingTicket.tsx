import clsx from 'clsx'
import type { BookingResponse } from '@/lib/api/bookings'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCOP, formatDayLong, formatDuration, formatHour, hourOf } from '@/lib/format'

interface Props {
  booking: BookingResponse
  venueName: string
  total?: number | null
  className?: string
  children?: React.ReactNode
}

/** Boleta de la reserva (propuesta v3): borde punteado, datos clave y el código en grande. */
export default function BookingTicket({ booking, venueName, total, className, children }: Props) {
  const start = hourOf(booking.startAt)
  const end = hourOf(booking.endAt)
  const day = formatDayLong(booking.startAt.slice(0, 10))
  const cancelled = booking.status === 'CANCELLED'

  return (
    <div
      className={clsx(
        'rounded-[18px] border-[1.5px] border-dashed border-line-2 p-4 text-left',
        cancelled && 'opacity-70',
        className
      )}
    >
      <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className="text-[12px] font-bold tracking-[0.08em] text-fg-3 uppercase">Cancha</dt>
          <dd className="font-extrabold text-fg">
            {venueName} · {booking.courtName}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] font-bold tracking-[0.08em] text-fg-3 uppercase">Cuándo</dt>
          <dd
            className={clsx('num font-extrabold text-fg first-letter:uppercase', cancelled && 'line-through')}
          >
            {day}, {formatHour(start)}–{formatHour(end)} · {formatDuration(end - start)}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] font-bold tracking-[0.08em] text-fg-3 uppercase">Estado</dt>
          <dd className="mt-1">
            <StatusBadge status={booking.status} />
          </dd>
        </div>
        {total != null && (
          <div>
            <dt className="text-[12px] font-bold tracking-[0.08em] text-fg-3 uppercase">Valor</dt>
            <dd className="num font-extrabold text-fg">{formatCOP(total)}</dd>
          </div>
        )}
      </dl>
      <div className="mt-4 border-t border-line pt-3 text-center">
        <div className="text-[12px] font-bold tracking-[0.08em] text-fg-3 uppercase">Código de reserva</div>
        <div className="mt-1 text-[18px] font-extrabold tracking-[0.12em] text-accent-text">
          {booking.bookingCode}
        </div>
      </div>
      {children && <div className="mt-3 border-t border-line pt-3">{children}</div>}
    </div>
  )
}
