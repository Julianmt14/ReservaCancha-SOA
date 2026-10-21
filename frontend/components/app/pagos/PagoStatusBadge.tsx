import type { PaymentStatus } from '@/lib/api/payments'

const config: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  APPROVED: { label: 'Aprobado', color: 'var(--green)', bg: 'var(--green-soft)' },
  PENDING: { label: 'Pendiente', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  DECLINED: { label: 'Rechazado', color: 'var(--red)', bg: 'var(--red-soft)' },
  VOIDED: { label: 'Anulado', color: 'var(--red)', bg: 'var(--red-soft)' },
  ERROR: { label: 'Error', color: 'var(--red)', bg: 'var(--red-soft)' },
}

export default function PagoStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, color, bg } = config[status] ?? config.PENDING
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
