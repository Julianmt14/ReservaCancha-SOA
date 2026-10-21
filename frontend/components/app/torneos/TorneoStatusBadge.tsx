import type { TorneoStatus } from '@/lib/types/torneos'

const config: Record<TorneoStatus, { label: string; color: string; bg: string }> = {
  activo: { label: 'Activo', color: 'var(--green)', bg: 'var(--green-soft)' },
  'en-preparacion': { label: 'En preparación', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  finalizado: { label: 'Finalizado', color: 'var(--text-3)', bg: 'var(--bg-2)' },
}

export default function TorneoStatusBadge({ status }: { status: TorneoStatus }) {
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
