'use client'

import { useState } from 'react'
import type { Reservation, WeekDay, ReservationStatus } from '@/lib/types/dashboard'
import WeekCalendarGrid, {
  fmtHour,
  toPercent,
  type CalendarColumn,
  type CalendarOverlay,
} from '@/components/app/ui/WeekCalendarGrid'

export type { Reservation, WeekDay, ReservationStatus }

const HOUR_START = 6
const HOUR_END = 23

const STATUS_COLOR: Record<ReservationStatus, { color: string; bg: string; border: string; label: string }> =
  {
    confirmed: {
      color: 'var(--green)',
      bg: 'rgba(27,158,75,0.18)',
      border: 'rgba(27,158,75,0.45)',
      label: 'Confirmada',
    },
    pending: {
      color: 'var(--amber)',
      bg: 'rgba(242,181,68,0.18)',
      border: 'rgba(242,181,68,0.45)',
      label: 'Pendiente',
    },
    canceled: {
      color: 'var(--red)',
      bg: 'rgba(229,72,77,0.18)',
      border: 'rgba(229,72,77,0.45)',
      label: 'Cancelada',
    },
  }

export default function WeekCalendar({
  days,
  reservations,
  monthLabel,
  weekLabel,
  onPrev,
  onNext,
  onToday,
  onBookingClick,
}: {
  days: WeekDay[]
  reservations: Reservation[]
  monthLabel: string
  weekLabel?: string
  onPrev?: () => void
  onNext?: () => void
  onToday?: () => void
  onBookingClick?: (r: Reservation) => void
}) {
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<ReservationStatus>>(new Set())

  function toggleStatus(s: ReservationStatus) {
    setHiddenStatuses((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const visible = reservations.filter((r) => !hiddenStatuses.has(r.status))

  const columns: CalendarColumn[] = days.map((d, i) => ({
    key: String(i),
    headerContent: (
      <>
        {d.label}
        <div
          className="mt-0.5 mx-auto text-[16px] font-bold normal-case tracking-normal leading-tight rounded-md"
          style={{
            color: d.today ? '#fff' : 'var(--text)',
            background: d.today ? 'var(--green)' : 'transparent',
            width: 28,
            lineHeight: '28px',
          }}
        >
          {d.date}
        </div>
      </>
    ),
    cellBg: d.today ? () => 'rgba(27,158,75,0.03)' : undefined,
  }))

  const overlays: CalendarOverlay[] = days.flatMap((_, dayIdx) => {
    const dayResvs = visible.filter((r) => r.day === dayIdx)
    if (!dayResvs.length) return []
    const nodes = dayResvs.map((r) => {
      const st = STATUS_COLOR[r.status]
      const { top, height } = toPercent(r.startHour, r.endHour, HOUR_START, HOUR_END)
      const durationH = r.endHour - r.startHour
      return (
        <div
          key={r.id}
          className="absolute left-[3px] right-[3px] rounded-md px-1.5 py-1 overflow-hidden"
          style={{
            top: `${top}%`,
            height: `${height}%`,
            background: st.bg,
            border: `1px solid ${st.border}`,
            boxShadow: `inset 3px 0 0 ${st.color}`,
            cursor: onBookingClick ? 'pointer' : 'default',
            pointerEvents: onBookingClick ? 'auto' : 'none',
          }}
          onClick={() => onBookingClick?.(r)}
        >
          <div className="text-[10px] font-semibold leading-tight truncate" style={{ color: st.color }}>
            {st.label}
          </div>
          {durationH >= 0.75 && (
            <>
              <div className="text-[9.5px] font-mono" style={{ color: st.color, opacity: 0.8 }}>
                {fmtHour(r.startHour)}–{fmtHour(r.endHour)}
              </div>
              {r.team && (
                <div className="text-[9px] truncate" style={{ color: st.color, opacity: 0.7 }}>
                  {r.team}
                </div>
              )}
            </>
          )}
        </div>
      )
    })
    return [{ colIndex: dayIdx, children: <>{nodes}</> }]
  })

  const filterItems: { status: ReservationStatus; label: string }[] = [
    { status: 'confirmed', label: 'Confirmadas' },
    { status: 'pending', label: 'Pendientes' },
    { status: 'canceled', label: 'Canceladas' },
  ]

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-5 py-4 flex-wrap"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <button
          onClick={onPrev}
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
          onClick={onNext}
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
        <div>
          <span
            className="font-bold text-[15px] tracking-[-0.02em] capitalize"
            style={{ color: 'var(--text)' }}
          >
            {monthLabel}
          </span>
          {weekLabel && (
            <span className="text-[13px] ml-2" style={{ color: 'var(--text-2)' }}>
              · sem. {weekLabel}
            </span>
          )}
        </div>
        <button
          onClick={onToday}
          className="px-3 py-[6px] rounded-lg text-[12px] font-semibold cursor-pointer"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)' }}
        >
          Hoy
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {filterItems.map(({ status, label }) => {
            const st = STATUS_COLOR[status]
            const hidden = hiddenStatuses.has(status)
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className="flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[11.5px] font-medium cursor-pointer transition-opacity"
                style={{
                  background: hidden ? 'var(--bg-2)' : st.bg,
                  border: `1px solid ${hidden ? 'var(--line)' : st.border}`,
                  color: hidden ? 'var(--text-3)' : st.color,
                  opacity: hidden ? 0.5 : 1,
                }}
              >
                <span className="size-2 rounded-full" style={{ background: st.color }} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <WeekCalendarGrid
        hourStart={HOUR_START}
        hourEnd={HOUR_END}
        columns={columns}
        overlays={overlays}
        maxHeight={520}
      />
    </div>
  )
}
