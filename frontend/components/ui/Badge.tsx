import clsx from 'clsx'

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

const TONE: Record<Tone, { box: string; dot: string }> = {
  neutral: { box: 'bg-surface-2 text-fg-2 border-line', dot: 'bg-fg-3' },
  accent: { box: 'bg-accent-soft text-accent-text border-accent-line', dot: 'bg-accent' },
  success: { box: 'bg-success-soft text-success border-transparent', dot: 'bg-success' },
  warning: { box: 'bg-warning-soft text-warning border-transparent', dot: 'bg-warning' },
  danger: { box: 'bg-danger-soft text-danger border-transparent', dot: 'bg-danger' },
  info: { box: 'bg-info-soft text-info border-transparent', dot: 'bg-info' },
}

interface BadgeProps {
  tone?: Tone
  dot?: boolean
  /** Etiqueta en mayúsculas tipo "ÚLTIMOS CUPOS". */
  caps?: boolean
  className?: string
  children: React.ReactNode
}

export default function Badge({ tone = 'neutral', dot, caps, className, children }: BadgeProps) {
  const t = TONE[tone]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 h-6 whitespace-nowrap',
        caps ? 'text-[10.5px] font-bold uppercase tracking-[0.1em]' : 'text-[12px] font-semibold',
        t.box,
        className
      )}
    >
      {dot && <span className={clsx('size-1.5 rounded-full shrink-0', t.dot)} />}
      {children}
    </span>
  )
}

// ─── Estado unificado (reserva / pago / cancha / torneo) ─────────────────────

export type StatusKind =
  'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR'

const STATUS: Record<StatusKind, { label: string; tone: Tone }> = {
  CONFIRMED: { label: 'Confirmada', tone: 'success' },
  COMPLETED: { label: 'Jugada', tone: 'neutral' },
  PENDING: { label: 'Pendiente de pago', tone: 'warning' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
  APPROVED: { label: 'Pago aprobado', tone: 'success' },
  DECLINED: { label: 'Pago rechazado', tone: 'danger' },
  VOIDED: { label: 'Pago anulado', tone: 'danger' },
  ERROR: { label: 'Error en el pago', tone: 'danger' },
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusKind
  label?: string
  className?: string
}) {
  const s = STATUS[status]
  return (
    <Badge tone={s.tone} dot className={className}>
      {label ?? s.label}
    </Badge>
  )
}
