import type { CanchaStatus } from '@/lib/types/canchas'

const config: Record<CanchaStatus, { label: string; color: string; bg: string }> = {
  activa: { label: 'Activa', color: 'var(--green)', bg: 'var(--green-soft)' },
  mantenimiento: { label: 'Mantenimiento', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  inactiva: { label: 'Inactiva', color: 'var(--red)', bg: 'var(--red-soft)' },
}

export default function CanchaStatusBadge({ status }: { status: CanchaStatus }) {
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
