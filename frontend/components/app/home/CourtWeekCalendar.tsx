'use client'

import { useState, useMemo } from 'react'
import type { CourtResponse, ScheduleResponse } from '@/lib/api/courts'
import type { BookingResponse } from '@/lib/api/bookings'
import BookingDetailModal from '@/components/app/reservas/BookingDetailModal'
import WeekCalendarGrid, {
  DAY_ORDER,
  DAY_LABEL_SHORT,
  parseHour,
  fmtHour,
  toPercent,
  type CalendarColumn,
  type CalendarOverlay,
} from '@/components/app/ui/WeekCalendarGrid'

function getWeekStart(ref: Date): Date {
  const d = new Date(ref)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface SlotBlock {
  startHour: number
  endHour: number
  type: 'available' | 'booked'
  playerId?: number
  status?: string
  booking?: BookingResponse
}

function buildSlots(
  dayDate: Date,
  schedule: ScheduleResponse | undefined,
  bookings: BookingResponse[]
): SlotBlock[] {
  const dateStr = isoDate(dayDate)
  const dayBookings = bookings
    .filter((b) => {
      const localDate = new Date(b.startAt)
      return isoDate(localDate) === dateStr && b.status !== 'CANCELLED'
    })
    .map((b) => {
      const s = new Date(b.startAt),
        e = new Date(b.endAt)
      return {
        start: s.getHours() + s.getMinutes() / 60,
        end: e.getHours() + e.getMinutes() / 60,
        playerId: b.playerId,
        status: b.status,
        booking: b,
      }
    })
    .sort((a, z) => a.start - z.start)

  const hasSchedule = schedule?.active
  const open = hasSchedule ? parseHour(schedule!.openingTime) : null
  const close = hasSchedule ? parseHour(schedule!.closingTime) : null

  const blocks: SlotBlock[] = []
  let cursor = open ?? Infinity

  for (const { start, end, playerId, status, booking } of dayBookings) {
    if (hasSchedule && start > cursor) blocks.push({ startHour: cursor, endHour: start, type: 'available' })
    blocks.push({ startHour: start, endHour: end, type: 'booked', playerId, status, booking })
    cursor = end
  }
  if (hasSchedule && close !== null && cursor < close) {
    blocks.push({ startHour: cursor, endHour: close, type: 'available' })
  }
  return blocks
}

interface Props {
  court: CourtResponse
  schedules: ScheduleResponse[]
  bookings: BookingResponse[]
  currentUserId?: number
  onReserve: () => void
  onSlotClick?: (date: string, startHour: number) => void
}

export default function CourtWeekCalendar({
  court,
  schedules,
  bookings,
  currentUserId,
  onReserve,
  onSlotClick,
}: Props) {
  const [weekStart, setWeekStart] = useState(() => {
    const stored = sessionStorage.getItem('openCourtWeekDate')
    if (stored) {
      sessionStorage.removeItem('openCourtWeekDate')
      return getWeekStart(new Date(stored))
    }
    return getWeekStart(new Date())
  })
  const [detailBooking, setDetailBooking] = useState<BookingResponse | null>(null)
  const today = isoDate(new Date())
  const nowHour = new Date().getHours() + 1 // bloquear hora actual y anteriores

  const days = useMemo(
    () =>
      DAY_ORDER.map((dow, i) => ({
        dow,
        date: addDays(weekStart, i),
        schedule: schedules.find((s) => s.dayOfWeek === dow),
      })),
    [weekStart, schedules]
  )

  const { hourStart, hourEnd } = useMemo(() => {
    const active = schedules.filter((s) => s.active)
    if (active.length) {
      return {
        hourStart: Math.min(...active.map((s) => Math.floor(parseHour(s.openingTime)))),
        hourEnd: Math.max(...active.map((s) => Math.ceil(parseHour(s.closingTime)))),
      }
    }
    // No schedules — derive range from bookings if any, else default
    if (bookings.length) {
      const hours = bookings.flatMap((b) => {
        const s = new Date(b.startAt),
          e = new Date(b.endAt)
        return [s.getHours(), e.getHours() + (e.getMinutes() > 0 ? 1 : 0)]
      })
      return { hourStart: Math.max(0, Math.min(...hours) - 1), hourEnd: Math.min(24, Math.max(...hours) + 1) }
    }
    return { hourStart: 6, hourEnd: 22 }
  }, [schedules, bookings])

  const monthLabel = weekStart.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const weekEndDate = addDays(weekStart, 6)
  const weekLabel = `${weekStart.getDate()} – ${weekEndDate.getDate()}`
  const columns: CalendarColumn[] = days.map(({ dow, date }) => {
    const isToday = isoDate(date) === today
    const isPast = isoDate(date) < today
    return {
      key: dow,
      headerColor: isPast ? 'var(--text-3)' : 'var(--text-3)',
      headerContent: (
        <>
          {DAY_LABEL_SHORT[dow]}
          <div
            className="mt-0.5 mx-auto text-[16px] font-bold normal-case tracking-normal leading-tight rounded-md"
            style={{
              color: isToday ? '#fff' : isPast ? 'var(--text-3)' : 'var(--text)',
              background: isToday ? 'var(--green)' : 'transparent',
              width: 28,
              lineHeight: '28px',
            }}
          >
            {date.getDate()}
          </div>
        </>
      ),
      cellBg: isPast ? () => 'rgba(255,255,255,0.02)' : isToday ? () => 'rgba(27,158,75,0.03)' : undefined,
    }
  })

  const overlays: CalendarOverlay[] = days.flatMap(({ date, schedule }, colIndex) => {
    const slots = buildSlots(date, schedule, bookings)
    if (!slots.length) return []
    const dateStr = isoDate(date)
    const isPast = dateStr < today
    const nodes = slots.flatMap((slot, si) => {
      const { top, height } = toPercent(slot.startHour, slot.endHour, hourStart, hourEnd)
      if (slot.type === 'available') {
        // split into 1-hour clickable blocks
        const blocks = []
        for (let h = Math.floor(slot.startHour); h < slot.endHour; h++) {
          const { top: bTop, height: bH } = toPercent(h, h + 1, hourStart, hourEnd)
          const blocked = isPast || (dateStr === today && h < nowHour)
          blocks.push(
            <div
              key={`${si}-${h}`}
              className="absolute left-[3px] right-[3px] rounded-md flex items-center justify-center"
              style={{
                top: `${bTop}%`,
                height: `${bH}%`,
                background: blocked ? 'rgba(255,255,255,0.03)' : 'rgba(27,158,75,0.15)',
                border: `1px solid ${blocked ? 'rgba(255,255,255,0.06)' : 'rgba(27,158,75,0.40)'}`,
                cursor: !blocked && onSlotClick ? 'pointer' : 'default',
                pointerEvents: !blocked && onSlotClick ? 'auto' : 'none',
              }}
              onClick={() => {
                if (!blocked) onSlotClick?.(dateStr, h)
              }}
            >
              {!blocked && (
                <span className="text-[10px] font-semibold select-none" style={{ color: 'var(--green)' }}>
                  {fmtHour(h)}–{fmtHour(h + 1)}
                </span>
              )}
            </div>
          )
        }
        return blocks
      }
      const isOwn = currentUserId !== undefined && slot.playerId === currentUserId
      const isPending = isOwn && slot.status === 'PENDING'
      const color = isPending ? 'var(--amber)' : isOwn ? 'var(--blue)' : 'var(--red)'
      const bg = isPending
        ? 'rgba(242,181,68,0.18)'
        : isOwn
          ? 'rgba(76,141,245,0.18)'
          : 'rgba(229,72,77,0.18)'
      const border = isPending
        ? 'rgba(242,181,68,0.45)'
        : isOwn
          ? 'rgba(76,141,245,0.45)'
          : 'rgba(229,72,77,0.45)'
      const label = isPending ? 'Pendiente' : isOwn ? 'Mi reserva' : 'Reservado'
      return [
        <div
          key={si}
          className="absolute left-[3px] right-[3px] rounded-md px-1.5 py-1 overflow-hidden"
          style={{
            top: `${top}%`,
            height: `${height}%`,
            background: bg,
            border: `1px solid ${border}`,
            boxShadow: `inset 3px 0 0 ${color}`,
            cursor: isOwn ? 'pointer' : 'default',
            pointerEvents: isOwn ? 'auto' : 'none',
          }}
          onClick={() => {
            if (isOwn && slot.booking) setDetailBooking(slot.booking)
          }}
        >
          <div className="text-[10px] font-semibold leading-tight truncate" style={{ color }}>
            {label}
          </div>
          {slot.endHour - slot.startHour >= 0.75 && (
            <div
              className="text-[9.5px] font-mono"
              style={{
                color: isPending
                  ? 'rgba(242,181,68,0.8)'
                  : isOwn
                    ? 'rgba(76,141,245,0.8)'
                    : 'rgba(229,72,77,0.8)',
              }}
            >
              {fmtHour(slot.startHour)}–{fmtHour(slot.endHour)}
            </div>
          )}
        </div>,
      ]
    })
    return [{ colIndex, children: nodes }]
  })

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
        <div>
          <span
            className="font-bold text-[15px] tracking-[-0.02em] capitalize"
            style={{ color: 'var(--text)' }}
          >
            {monthLabel}
          </span>
          <span className="text-[13px] ml-2" style={{ color: 'var(--text-2)' }}>
            · sem. {weekLabel}
          </span>
        </div>
        <button
          onClick={() => setWeekStart(getWeekStart(new Date()))}
          className="px-3 py-[6px] rounded-lg text-[12px] font-semibold cursor-pointer"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)' }}
        >
          Hoy
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-[11.5px]" style={{ color: 'var(--text-3)' }}>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: 'rgba(27,158,75,0.35)', border: '1px solid rgba(27,158,75,0.6)' }}
            />
            Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: 'rgba(76,141,245,0.30)', border: '1px solid rgba(76,141,245,0.6)' }}
            />
            Mi reserva
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: 'rgba(242,181,68,0.30)', border: '1px solid rgba(242,181,68,0.6)' }}
            />
            Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: 'rgba(229,72,77,0.30)', border: '1px solid rgba(229,72,77,0.6)' }}
            />
            Reservado
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
            />
            Cerrado
          </span>
        </div>
        <button
          onClick={onReserve}
          disabled={!court.active}
          className="px-4 py-[6px] rounded-lg text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--green)', color: '#fff' }}
          onMouseEnter={(e) => {
            if (court.active) e.currentTarget.style.background = 'var(--green-deep)'
          }}
          onMouseLeave={(e) => {
            if (court.active) e.currentTarget.style.background = 'var(--green)'
          }}
        >
          + Reservar
        </button>
      </div>

      <WeekCalendarGrid
        hourStart={hourStart}
        hourEnd={hourEnd}
        columns={columns}
        overlays={overlays}
        maxHeight={560}
      />

      <BookingDetailModal
        open={detailBooking !== null}
        onClose={() => setDetailBooking(null)}
        booking={detailBooking}
        pricePerHour={court.pricePerHour}
        ownerName={court.businessName}
      />
    </div>
  )
}
