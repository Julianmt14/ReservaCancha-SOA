import type { ReservationStatus } from '@/lib/types/dashboard'

const config: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmada', color: 'var(--green)', bg: 'var(--green-soft)' },
  pending: { label: 'Pendiente', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  canceled: { label: 'Cancelada', color: 'var(--red)', bg: 'var(--red-soft)' },
}

export default function ReservaStatusBadge({ status }: { status: ReservationStatus }) {
  const { label, color, bg } = config[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color, background: bg }}
    >
      <span className="size-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}
