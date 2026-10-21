'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useBusiness } from '@/lib/context/business-context'
import { getCourts, getSchedules, type ScheduleResponse } from '@/lib/api/courts'
import { getBookingsByCourt, type BookingResponse } from '@/lib/api/bookings'
import StatsGrid from '@/components/app/dashboard/StatsGrid'
import WeekCalendar from '@/components/app/dashboard/WeekCalendar'
import BookingDetailModal from '@/components/app/reservas/BookingDetailModal'
import PlayerHome from '@/components/app/home/PlayerHome'
import {
  IconStatReservas,
  IconStatIngresos,
  IconStatOcupacion,
  IconStatNoShows,
} from '@/components/app/icons'
import type { StatItem, WeekDay, Reservation } from '@/lib/types/dashboard'

// ─── helpers ────────────────────────────────────────────────────────────────

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

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CO')
}

type Period = 'semana' | 'mes' | 'trimestre' | 'año'

const PERIOD_LABELS: Record<Period, string> = {
  semana: 'Semana',
  mes: 'Mes',
  trimestre: 'Trimestre',
  año: 'Año',
}

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date()
  if (period === 'semana') {
    const start = getWeekStart(now)
    return { start, end: addDays(start, 6) }
  }
  if (period === 'mes') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { start, end }
  }
  if (period === 'trimestre') {
    const q = Math.floor(now.getMonth() / 3)
    const start = new Date(now.getFullYear(), q * 3, 1)
    const end = new Date(now.getFullYear(), q * 3 + 3, 0)
    return { start, end }
  }
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear(), 11, 31)
  return { start, end }
}

function getPrevPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date()
  if (period === 'semana') {
    const start = addDays(getWeekStart(now), -7)
    return { start, end: addDays(start, 6) }
  }
  if (period === 'mes') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start, end }
  }
  if (period === 'trimestre') {
    const q = Math.floor(now.getMonth() / 3)
    const start = new Date(now.getFullYear(), (q - 1) * 3, 1)
    const end = new Date(now.getFullYear(), q * 3, 0)
    return { start, end }
  }
  const start = new Date(now.getFullYear() - 1, 0, 1)
  const end = new Date(now.getFullYear() - 1, 11, 31)
  return { start, end }
}

function calcOcupacion(
  start: Date,
  end: Date,
  bookings: BookingResponse[],
  scheduleMap: Record<number, ScheduleResponse[]>
): number {
  const courtIds = Object.keys(scheduleMap).map(Number)
  if (!courtIds.length) return 0
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  let availableH = 0
  let bookedH = 0
  for (let i = 0; i < totalDays; i++) {
    const day = addDays(start, i)
    const dow = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][day.getDay()]
    const dateStr = localIsoDate(day)
    for (const courtId of courtIds) {
      const sched = (scheduleMap[courtId] ?? []).find((s) => s.dayOfWeek === dow && s.active)
      if (!sched) continue
      const [oh, om] = sched.openingTime.split(':').map(Number)
      const [ch, cm] = sched.closingTime.split(':').map(Number)
      availableH += (ch === 23 && cm === 59 ? 24 : ch + cm / 60) - (oh + om / 60)
      bookings
        .filter(
          (b) =>
            b.courtId === courtId && localIsoDate(new Date(b.startAt)) === dateStr && b.status !== 'CANCELLED'
        )
        .forEach((b) => {
          bookedH += (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3600000
        })
    }
  }
  return availableH > 0 ? Math.min(100, Math.round((bookedH / availableH) * 100)) : 0
}

function periodLabel(period: Period): string {
  const now = new Date()
  if (period === 'semana') return 'esta semana'
  if (period === 'mes') return now.toLocaleDateString('es-CO', { month: 'long' })
  if (period === 'trimestre') {
    const q = Math.floor(now.getMonth() / 3) + 1
    return `Q${q} ${now.getFullYear()}`
  }
  return String(now.getFullYear())
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

function AdminDashboard() {
  const { user } = useAuth()
  const { activeBusiness } = useBusiness()
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [priceMap, setPriceMap] = useState<Record<number, number>>({})
  const [scheduleMap, setScheduleMap] = useState<Record<number, ScheduleResponse[]>>({})
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [period, setPeriod] = useState<Period>('semana')
  const [detailBooking, setDetailBooking] = useState<BookingResponse | null>(null)

  useEffect(() => {
    if (!activeBusiness) return
    setLoading(true)
    getCourts(0, 100)
      .then((cs) => {
        const bizCourts = cs.content.filter((c) => c.businessId === activeBusiness.id)
        const pm: Record<number, number> = {}
        bizCourts.forEach((c) => {
          pm[c.id] = c.pricePerHour
        })
        setPriceMap(pm)
        return Promise.all(
          bizCourts.map(async (c) => {
            const [bookingsPage, schedules] = await Promise.all([
              getBookingsByCourt(c.id, 0, 500).catch(() => ({ content: [] as BookingResponse[] })),
              getSchedules(c.id).catch(() => [] as ScheduleResponse[]),
            ])
            return { courtId: c.id, bookings: bookingsPage.content, schedules }
          })
        )
      })
      .then((results) => {
        setBookings(results.flatMap((r) => r.bookings))
        const sm: Record<number, ScheduleResponse[]> = {}
        results.forEach((r) => {
          sm[r.courtId] = r.schedules
        })
        setScheduleMap(sm)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeBusiness?.id])

  // ── Week calendar data ────────────────────────────────────────────────────

  const days: WeekDay[] = useMemo(() => {
    const today = localIsoDate(new Date())
    const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      return { label: DAY_LABELS[i], date: d.getDate(), today: localIsoDate(d) === today }
    })
  }, [weekStart])

  const reservations: Reservation[] = useMemo(() => {
    return bookings.flatMap((b) => {
      if (b.status === 'CANCELLED') return []
      const d = new Date(b.startAt)
      const dateStr = localIsoDate(d)
      const dayIndex = Array.from({ length: 7 }, (_, i) => localIsoDate(addDays(weekStart, i))).indexOf(
        dateStr
      )
      if (dayIndex === -1) return []
      const s = new Date(b.startAt),
        e = new Date(b.endAt)
      const startHour = s.getHours() + s.getMinutes() / 60
      const endHour = e.getHours() + e.getMinutes() / 60
      const status =
        b.status === 'CONFIRMED' ? 'confirmed' : b.status === 'COMPLETED' ? 'confirmed' : 'pending'
      return [
        {
          id: String(b.id),
          day: dayIndex,
          startHour,
          endHour,
          status,
          team: b.playerName,
          detail: b.courtName,
          booking: b,
        },
      ]
    })
  }, [bookings, weekStart])

  // ── Period stats ─────────────────────────────────────────────────────────

  const stats: StatItem[] = useMemo(() => {
    const { start, end } = getPeriodRange(period)
    const startStr = localIsoDate(start)
    const endStr = localIsoDate(end)

    const inPeriod = bookings.filter((b) => {
      const d = localIsoDate(new Date(b.startAt))
      return d >= startStr && d <= endStr && b.status !== 'CANCELLED'
    })

    const ingresos = inPeriod.reduce((acc, b) => {
      const h = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3600000
      return acc + (priceMap[b.courtId] ?? 0) * h
    }, 0)

    const { start: ps, end: pe } = getPrevPeriodRange(period)
    const prevStartStr = localIsoDate(ps)
    const prevEndStr = localIsoDate(pe)

    const pendientes = inPeriod.filter((b) => b.status === 'PENDING').length
    const canceladas = bookings.filter((b) => {
      const d = localIsoDate(new Date(b.startAt))
      return d >= startStr && d <= endStr && b.status === 'CANCELLED'
    }).length
    const prevCanceladas = bookings.filter((b) => {
      const d = localIsoDate(new Date(b.startAt))
      return d >= prevStartStr && d <= prevEndStr && b.status === 'CANCELLED'
    }).length
    const pl = periodLabel(period)

    const prevPeriod = bookings.filter((b) => {
      const d = localIsoDate(new Date(b.startAt))
      return d >= prevStartStr && d <= prevEndStr && b.status !== 'CANCELLED'
    })
    const prevIngresos = prevPeriod.reduce((acc, b) => {
      const h = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3600000
      return acc + (priceMap[b.courtId] ?? 0) * h
    }, 0)

    const reservasDelta = inPeriod.length - prevPeriod.length
    const ingresosDelta = ingresos - prevIngresos

    const ocupacionPct = calcOcupacion(start, end, bookings, scheduleMap)
    const ocupacionPrevPct = calcOcupacion(ps, pe, bookings, scheduleMap)
    const ocupacionDelta = ocupacionPct - ocupacionPrevPct

    const deltaStr = (n: number) => `${n >= 0 ? '+' : ''}${n}`

    return [
      {
        id: 'reservas',
        label: `Reservas ${pl}`,
        iconVariant: 'green',
        icon: <IconStatReservas />,
        value: loading ? '—' : inPeriod.length,
        deltaDir: reservasDelta >= 0 ? 'up' : 'down',
        deltaLabel: deltaStr(reservasDelta),
        subLabel: loading ? 'cargando…' : `${pendientes} pendientes`,
      },
      {
        id: 'ingresos',
        label: `Ingresos ${pl}`,
        iconVariant: 'blue',
        icon: <IconStatIngresos />,
        value: loading ? '—' : fmt(ingresos),
        deltaDir: ingresosDelta >= 0 ? 'up' : 'down',
        deltaLabel: fmt(ingresosDelta),
        subLabel: loading ? 'cargando…' : 'basado en tarifa por hora',
      },
      {
        id: 'ocupacion',
        label: `Ocupación ${pl}`,
        iconVariant: 'amber',
        icon: <IconStatOcupacion />,
        value: loading ? '—' : `${ocupacionPct}%`,
        deltaDir: ocupacionDelta >= 0 ? 'up' : 'down',
        deltaLabel: `${deltaStr(ocupacionDelta)}%`,
        subLabel: loading ? 'cargando…' : 'promedio del complejo',
        ring: { pct: ocupacionPct },
      },
      {
        id: 'canceladas',
        label: `Canceladas ${pl}`,
        iconVariant: 'red',
        icon: <IconStatNoShows />,
        value: loading ? '—' : canceladas,
        deltaDir: canceladas - prevCanceladas <= 0 ? 'up' : 'down',
        deltaLabel: deltaStr(canceladas - prevCanceladas),
        subLabel: loading ? 'cargando…' : 'reservas canceladas',
      },
    ]
  }, [bookings, priceMap, scheduleMap, loading, period])

  // ── Labels ───────────────────────────────────────────────────────────────

  const monthLabel = weekStart.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const weekLabel = `${weekStart.getDate()} – ${addDays(weekStart, 6).getDate()}`

  const firstName = user?.fullName?.split(' ')[0] ?? ''
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="flex flex-col gap-6 p-7">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-text">
            {greeting},{' '}
            <em
              className="not-italic font-normal text-brand"
              style={{ fontFamily: 'Instrument Serif, serif', letterSpacing: '-0.01em' }}
            >
              {firstName}
            </em>
          </h1>
          <p className="mt-[6px] text-[13.5px] text-text-2">Resumen del complejo en tiempo real.</p>
        </div>

        {/* Period selector */}
        <div
          className="flex overflow-hidden rounded-lg border border-line"
          style={{ background: 'var(--bg-2)' }}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-[14px] py-[7px] text-[12.5px] font-semibold cursor-pointer transition-colors"
              style={{
                background: period === p ? 'var(--panel-2)' : 'transparent',
                color: period === p ? 'var(--text)' : 'var(--text-3)',
                borderRight: p !== 'año' ? '1px solid var(--line)' : undefined,
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <StatsGrid stats={stats} />

      <WeekCalendar
        days={days}
        reservations={reservations}
        monthLabel={monthLabel}
        weekLabel={weekLabel}
        onPrev={() => setWeekStart((w) => addDays(w, -7))}
        onNext={() => setWeekStart((w) => addDays(w, 7))}
        onToday={() => setWeekStart(getWeekStart(new Date()))}
        onBookingClick={(r) => r.booking && setDetailBooking(r.booking)}
      />

      <BookingDetailModal
        open={detailBooking !== null}
        onClose={() => setDetailBooking(null)}
        booking={detailBooking}
        pricePerHour={detailBooking ? priceMap[detailBooking.courtId] : undefined}
      />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user?.role === 'JUGADOR') return <PlayerHome />
  return <AdminDashboard />
}
