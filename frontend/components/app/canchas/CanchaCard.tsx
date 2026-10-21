import type { CourtResponse, ScheduleResponse } from '@/lib/api/courts'
import type { BookingResponse } from '@/lib/api/bookings'
import CanchaStatusBadge from './CanchaStatusBadge'

function localIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function getWeekStart(ref: Date) {
  const d = new Date(ref)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function OccupancyBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-mono font-semibold w-8 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

interface Props {
  court: CourtResponse
  bookings: BookingResponse[]
  schedules: ScheduleResponse[]
  onClick?: () => void
  onEdit?: () => void
}

export default function CanchaCard({ court, bookings, schedules, onClick, onEdit }: Props) {
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO')
  const now = new Date()
  const weekStart = getWeekStart(now)
  const monthStart = localIsoDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = localIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))

  const weekBookings = bookings.filter((b) => {
    const d = localIsoDate(new Date(b.startAt))
    const ws = localIsoDate(weekStart)
    const we = localIsoDate(addDays(weekStart, 6))
    return d >= ws && d <= we && b.status !== 'CANCELLED'
  })

  const revenueThisMonth = bookings
    .filter((b) => {
      const d = localIsoDate(new Date(b.startAt))
      return d >= monthStart && d <= monthEnd && b.status !== 'CANCELLED'
    })
    .reduce((acc, b) => {
      const h = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3600000
      return acc + court.pricePerHour * h
    }, 0)

  // Ocupación semanal: horas reservadas / horas disponibles según horarios
  const occupancyPct = (() => {
    let availableH = 0
    let bookedH = 0
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    for (const day of days) {
      const dow = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][day.getDay()]
      const sched = schedules.find((s) => s.dayOfWeek === dow && s.active)
      if (!sched) continue
      const [oh, om] = sched.openingTime.split(':').map(Number)
      const [ch, cm] = sched.closingTime.split(':').map(Number)
      availableH += (ch === 23 && cm === 59 ? 24 : ch + cm / 60) - (oh + om / 60)
      const dateStr = localIsoDate(day)
      bookings
        .filter((b) => localIsoDate(new Date(b.startAt)) === dateStr && b.status !== 'CANCELLED')
        .forEach((b) => {
          bookedH += (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3600000
        })
    }
    return availableH > 0 ? Math.min(100, Math.round((bookedH / availableH) * 100)) : 0
  })()

  // Horario resumido: rango entre apertura mínima y cierre máximo
  const activeSchedules = schedules.filter((s) => s.active)
  const openFrom = activeSchedules.length
    ? activeSchedules.reduce(
        (min, s) => (s.openingTime < min ? s.openingTime : min),
        activeSchedules[0].openingTime
      )
    : '—'
  const openUntil = activeSchedules.length
    ? activeSchedules.reduce(
        (max, s) => (s.closingTime > max ? s.closingTime : max),
        activeSchedules[0].closingTime
      )
    : '—'

  const sportLabel: Record<string, string> = { FUTBOL: 'Fútbol', PADEL: 'Pádel', VOLEIBOL: 'Voleibol' }

  return (
    <div
      onClick={onClick}
      className="rounded-[14px] p-5 flex flex-col gap-4 transition-transform hover:-translate-y-0.5"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>
              {court.name}
            </span>
            <CanchaStatusBadge status={court.active ? 'activa' : 'inactiva'} />
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {sportLabel[court.sportType] ?? court.sportType}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit?.()
          }}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 cursor-pointer"
          style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--line)' }}
        >
          Editar
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Precio/hora', value: fmt(court.pricePerHour), color: 'var(--text)' },
          { label: 'Reservas / sem.', value: weekBookings.length, color: 'var(--blue)' },
          { label: 'Ingresos mes', value: fmt(revenueThisMonth), color: 'var(--green)' },
        ].map((m) => (
          <div key={m.label} className="rounded-lg px-3 py-2.5" style={{ background: 'var(--bg-2)' }}>
            <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>
              {m.label}
            </div>
            <div className="text-[13px] font-bold font-mono" style={{ color: m.color }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Ocupación */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10.5px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          Ocupación semanal
        </div>
        <OccupancyBar pct={occupancyPct} />
      </div>

      {/* Horario + descripción */}
      <div className="flex flex-col gap-2">
        <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
          Horario:{' '}
          <span style={{ color: 'var(--text-2)' }}>
            {activeSchedules.length ? `${openFrom} – ${openUntil}` : 'Sin horario configurado'}
          </span>
        </div>
        {court.description && (
          <div className="flex flex-wrap gap-1.5">
            <span
              className="text-[10.5px] px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-2)', color: 'var(--text-3)', border: '1px solid var(--line)' }}
            >
              {court.description}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
