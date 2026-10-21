'use client'

import { useState } from 'react'
import type { ScheduleResponse } from '@/lib/api/courts'
import type { BookingResponse } from '@/lib/api/bookings'
import { createSchedule, updateSchedule } from '@/lib/api/courts'
import WeekCalendarGrid, {
  DAY_ORDER,
  DAY_LABEL_SHORT,
  fmtHour,
  toPercent,
  type CalendarColumn,
  type CalendarOverlay,
  type DayOfWeek,
} from '@/components/app/ui/WeekCalendarGrid'

const HOUR_START = 6
const HOUR_END = 24

const DAY_FULL: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
}

function fromHHMM(s: string) {
  const [h, m] = s.split(':').map(Number)
  return h === 23 && m === 59 ? 24 : h + m / 60
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  PENDING: {
    color: 'var(--amber)',
    bg: 'rgba(242,181,68,0.18)',
    border: 'rgba(242,181,68,0.45)',
    label: 'Pendiente',
  },
  CONFIRMED: {
    color: 'var(--blue)',
    bg: 'rgba(76,141,245,0.18)',
    border: 'rgba(76,141,245,0.45)',
    label: 'Confirmada',
  },
  COMPLETED: {
    color: 'var(--blue)',
    bg: 'rgba(76,141,245,0.18)',
    border: 'rgba(76,141,245,0.45)',
    label: 'Completada',
  },
  CANCELLED: {
    color: 'var(--red)',
    bg: 'rgba(229,72,77,0.18)',
    border: 'rgba(229,72,77,0.45)',
    label: 'Cancelada',
  },
}

interface Props {
  courtId: number
  schedules: ScheduleResponse[]
  bookings: BookingResponse[]
  onSaved: (s: ScheduleResponse) => void
  onDeleted?: (id: number) => void
  initialWeekStart?: Date
  onBookingClick?: (b: BookingResponse) => void
}

export default function ScheduleGrid({
  courtId,
  schedules,
  bookings,
  onSaved,
  onDeleted,
  initialWeekStart,
  onBookingClick,
}: Props) {
  const [manualDow, setManualDow] = useState<DayOfWeek>('MONDAY')
  const [manualOpen, setManualOpen] = useState('08:00')
  const [manualClose, setManualClose] = useState('23:59')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const schedFor = (dow: string) => schedules.find((s) => s.dayOfWeek === dow)
  const existingForSelected = schedFor(manualDow)

  function getWeekStart(ref: Date): Date {
    const d = new Date(ref)
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    d.setHours(0, 0, 0, 0)
    return d
  }
  const addDays = (d: Date, n: number) => {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
  }
  const [weekStart, setWeekStart] = useState(() => getWeekStart(initialWeekStart ?? new Date()))

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (fromHHMM(manualOpen) >= fromHHMM(manualClose)) {
      setError('La apertura debe ser anterior al cierre.')
      return
    }
    setSaving(true)
    try {
      const existing = schedFor(manualDow)
      const s = existing
        ? await updateSchedule(courtId, existing.id, {
            dayOfWeek: manualDow,
            openingTime: manualOpen,
            closingTime: manualClose,
          })
        : await createSchedule(courtId, {
            dayOfWeek: manualDow,
            openingTime: manualOpen,
            closingTime: manualClose,
          })
      onSaved(s)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!existingForSelected || !onDeleted) return
    if (!confirm(`¿Eliminar el horario del ${DAY_FULL[manualDow]}?`)) return
    setDeleting(true)
    try {
      onDeleted(existingForSelected.id)
    } finally {
      setDeleting(false)
    }
  }

  const columns: CalendarColumn[] = DAY_ORDER.map((dow, i) => ({
    key: dow,
    headerContent: (
      <>
        {DAY_LABEL_SHORT[dow]}
        <div className="mt-0.5 text-[12px] font-normal normal-case" style={{ color: 'var(--text-3)' }}>
          {addDays(weekStart, i).getDate()}
        </div>
      </>
    ),
    headerColor: schedFor(dow) ? 'var(--green)' : 'var(--text-3)',
  }))

  const overlays: CalendarOverlay[] = DAY_ORDER.flatMap((dow, colIndex) => {
    const sched = schedFor(dow)
    const colDate = addDays(weekStart, colIndex)

    // Bookings for this day
    const dateStr = isoDate(colDate)
    const dayBookings = bookings
      .filter((b) => isoDate(new Date(b.startAt)) === dateStr && b.status !== 'CANCELLED')
      .map((b) => {
        const s = new Date(b.startAt),
          en = new Date(b.endAt)
        return {
          startH: s.getHours() + s.getMinutes() / 60,
          endH: en.getHours() + en.getMinutes() / 60,
          status: b.status,
          playerName: b.playerName,
          raw: b,
        }
      })
      .sort((a, z) => a.startH - z.startH)

    const nodes: React.ReactNode[] = []

    // Hour-by-hour slots inside schedule (available or booked)
    if (sched?.active) {
      const open = fromHHMM(sched.openingTime)
      const close = fromHHMM(sched.closingTime)
      for (let h = Math.floor(open); h < close; h++) {
        const booking = dayBookings.find((b) => b.startH <= h && h < b.endH)
        const { top: bTop, height: bH } = toPercent(h, h + 1, HOUR_START, HOUR_END)
        if (booking) continue // booking node drawn separately below
        nodes.push(
          <div
            key={`h-${h}`}
            className="absolute left-[3px] right-[3px] rounded-md flex items-center justify-center"
            style={{
              top: `${bTop}%`,
              height: `${bH}%`,
              background: 'rgba(27,158,75,0.15)',
              border: '1px solid rgba(27,158,75,0.40)',
              pointerEvents: 'none',
            }}
          >
            <span className="text-[10px] font-semibold select-none" style={{ color: 'var(--green)' }}>
              {fmtHour(h)}–{fmtHour(h + 1)}
            </span>
          </div>
        )
      }
    }

    // Booking blocks
    for (const { startH, endH, status, playerName, raw } of dayBookings) {
      const st = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING
      const { top, height } = toPercent(startH, endH, HOUR_START, HOUR_END)
      const clickable = !!onBookingClick
      nodes.push(
        <div
          key={`b-${startH}`}
          className="absolute left-[3px] right-[3px] rounded-md px-1.5 py-1 overflow-hidden"
          style={{
            top: `${top}%`,
            height: `${height}%`,
            background: st.bg,
            border: `1px solid ${st.border}`,
            boxShadow: `inset 3px 0 0 ${st.color}`,
            cursor: clickable ? 'pointer' : 'default',
            pointerEvents: clickable ? 'auto' : 'none',
          }}
          onClick={() => onBookingClick?.(raw)}
        >
          <div className="text-[10px] font-semibold leading-tight truncate" style={{ color: st.color }}>
            {st.label}
          </div>
          {endH - startH >= 0.75 && (
            <>
              <div className="text-[9.5px] font-mono" style={{ color: st.color, opacity: 0.8 }}>
                {fmtHour(startH)}–{fmtHour(endH)}
              </div>
              <div className="text-[9px] truncate" style={{ color: st.color, opacity: 0.7 }}>
                {playerName}
              </div>
            </>
          )}
        </div>
      )
    }

    // Also show bookings on days with no schedule
    if (!sched?.active && dayBookings.length === 0) return []
    return [{ colIndex, children: <>{nodes}</> }]
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Form */}
      <form
        onSubmit={handleSave}
        className="flex flex-wrap items-end gap-3 rounded-xl px-4 py-4"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
      >
        <div className="flex flex-col gap-1">
          <label
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--text-3)' }}
          >
            Día
          </label>
          <select
            value={manualDow}
            onChange={(e) => {
              const dow = e.target.value as DayOfWeek
              setManualDow(dow)
              const existing = schedules.find((s) => s.dayOfWeek === dow)
              if (existing) {
                setManualOpen(existing.openingTime)
                setManualClose(existing.closingTime)
              }
            }}
            className="rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)' }}
          >
            {DAY_ORDER.map((d) => (
              <option key={d} value={d}>
                {DAY_FULL[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--text-3)' }}
          >
            Apertura
          </label>
          <select
            value={manualOpen}
            onChange={(e) => setManualOpen(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)' }}
          >
            {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => (
              <option key={h} value={`${String(h).padStart(2, '0')}:00`}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--text-3)' }}
          >
            Cierre
          </label>
          <select
            value={manualClose}
            onChange={(e) => setManualClose(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)' }}
          >
            {Array.from({ length: 17 }, (_, i) => i + 7).map((h) => (
              <option key={h} value={`${String(h).padStart(2, '0')}:00`}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
            <option value="23:59">23:59</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving || deleting}
          className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
          style={{ background: 'var(--green)', color: '#fff' }}
        >
          {saving ? 'Guardando…' : existingForSelected ? 'Actualizar horario' : 'Guardar horario'}
        </button>
        {existingForSelected && onDeleted && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red)' }}
          >
            {deleting ? 'Eliminando…' : 'Eliminar horario'}
          </button>
        )}
        {error && (
          <p className="w-full text-[12px]" style={{ color: 'var(--red)' }}>
            {error}
          </p>
        )}
      </form>

      {/* Calendar */}
      <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        {/* Week nav */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="size-8 rounded-lg grid place-items-center cursor-pointer"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="size-8 rounded-lg grid place-items-center cursor-pointer"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <span className="font-semibold text-[14px] capitalize" style={{ color: 'var(--text)' }}>
            {weekStart.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
          </span>
          <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>
            · {weekStart.getDate()} – {addDays(weekStart, 6).getDate()}
          </span>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="px-3 py-[5px] rounded-lg text-[12px] font-semibold cursor-pointer ml-1"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)' }}
          >
            Hoy
          </button>
        </div>
        <WeekCalendarGrid
          hourStart={HOUR_START}
          hourEnd={HOUR_END}
          columns={columns}
          overlays={overlays}
          maxHeight={480}
        />
      </div>
    </div>
  )
}
