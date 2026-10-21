'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '@/lib/auth/context'
import { useBusiness } from '@/lib/context/business-context'
import { useModalContext } from '@/lib/context/modal-context'
import { getCourts, getSchedules, type ScheduleResponse } from '@/lib/api/courts'
import { getBookingsByCourt, type BookingResponse } from '@/lib/api/bookings'
import WeekCalendar from '@/components/app/dashboard/WeekCalendar'
import BookingDetailModal from '@/components/app/reservas/BookingDetailModal'
import PlayerHome from '@/components/app/home/PlayerHome'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import { IconPlus } from '@/components/app/icons'
import {
  dayBookings,
  nextDays,
  openingHours,
  type CourtAvailability,
} from '@/components/app/booking/availability'
import { addDays, formatCOP, formatHour, hourOf, initials, isoDate, parseIsoDate } from '@/lib/format'
import type { WeekDay, Reservation } from '@/lib/types/dashboard'

// ─── helpers ────────────────────────────────────────────────────────────────

function getWeekStart(ref: Date) {
  const d = new Date(ref)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function hoursOf(b: BookingResponse) {
  return (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3600000
}

/** "Hoy", "Mañana", "Jue 23" */
function dayChip(iso: string, today: string): string {
  if (iso === today) return 'Hoy'
  if (iso === isoDate(addDays(parseIsoDate(today), 1))) return 'Mañana'
  const d = parseIsoDate(iso)
  const wd = d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getDate()}`
}

const PAID = new Set(['CONFIRMED', 'COMPLETED'])

/** Colores de la agenda (propuesta v3): pagada en menta, pendiente en ámbar, libre rayada. */
const BLOCK = {
  paid: 'bg-success-soft border-l-4 border-[#1F8A5B] text-fg',
  pending: 'bg-warning-soft border-l-4 border-[#E5A400] text-fg',
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

function AdminDashboard() {
  const { activeBusiness } = useBusiness()
  const { openNewReserva, isNewReservaOpen } = useModalContext()
  const [avs, setAvs] = useState<CourtAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const [date, setDate] = useState(() => isoDate(new Date()))
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [detailBooking, setDetailBooking] = useState<BookingResponse | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!activeBusiness) return
    let alive = true
    getCourts(0, 100)
      .then((cs) =>
        Promise.all(
          cs.content
            .filter((c) => c.businessId === activeBusiness.id)
            .map(async (court): Promise<CourtAvailability> => {
              const [bookingsPage, schedules] = await Promise.all([
                getBookingsByCourt(court.id, 0, 500).catch(() => ({ content: [] as BookingResponse[] })),
                getSchedules(court.id).catch(() => [] as ScheduleResponse[]),
              ])
              return { court, schedules, bookings: bookingsPage.content }
            })
        )
      )
      .then((results) => alive && setAvs(results))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [activeBusiness, version])

  // Al cerrar "Nueva reserva" se recarga la agenda; el reloj marca la hora actual cada minuto.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !isNewReservaOpen) setVersion((v) => v + 1)
    wasOpen.current = isNewReservaOpen
  }, [isNewReservaOpen])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const today = isoDate(new Date(now))
  const days = nextDays(7, new Date(now))
  const priceOf = (courtId: number) => avs.find((a) => a.court.id === courtId)?.court.pricePerHour ?? 0
  const bookings = useMemo(() => avs.flatMap((a) => a.bookings), [avs])

  // ── KPIs del día elegido ──────────────────────────────────────────────────
  const dayList = avs.flatMap((a) => dayBookings(a, date))
  const openH = avs.reduce((acc, a) => {
    const h = openingHours(a, date)
    return acc + (h ? h.close - h.open : 0)
  }, 0)
  const bookedH = dayList.reduce((acc, b) => acc + hoursOf(b), 0)
  const occupancy = openH > 0 ? Math.min(100, Math.round((bookedH / openH) * 100)) : 0
  const income = dayList.reduce((acc, b) => acc + priceOf(b.courtId) * hoursOf(b), 0)
  const paidList = dayList.filter((b) => PAID.has(b.status))
  const pendingList = dayList.filter((b) => b.status === 'PENDING')
  const paidAmount = paidList.reduce((acc, b) => acc + priceOf(b.courtId) * hoursOf(b), 0)
  const pendingAmount = pendingList.reduce((acc, b) => acc + priceOf(b.courtId) * hoursOf(b), 0)

  // ── Agenda: filas por hora, columnas por cancha ───────────────────────────
  const open = avs.map((a) => openingHours(a, date)).filter((h): h is { open: number; close: number } => !!h)
  const first = open.length ? Math.floor(Math.min(...open.map((h) => h.open))) : 6
  const last = open.length ? Math.ceil(Math.max(...open.map((h) => h.close))) : 23
  const rows = Array.from({ length: Math.max(0, last - first) }, (_, i) => first + i)
  const nowHour = date === today ? new Date(now).getHours() : -1
  const freeCount = avs.reduce((acc, a) => {
    const h = openingHours(a, date)
    if (!h) return acc
    const taken = dayBookings(a, date)
    let n = 0
    for (let s = Math.ceil(h.open); s + 1 <= h.close; s++) {
      if (date === today && s <= nowHour) continue
      if (!taken.some((b) => hourOf(b.startAt) < s + 1 && hourOf(b.endAt) > s)) n++
    }
    return acc + n
  }, 0)

  // ── Próximas reservas (desde ahora) ───────────────────────────────────────
  const upcoming = bookings
    .filter((b) => b.status !== 'CANCELLED' && new Date(b.endAt).getTime() >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  // ── Semana (calendario de abajo) ──────────────────────────────────────────
  const weekDays: WeekDay[] = useMemo(() => {
    const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      return { label: DAY_LABELS[i], date: d.getDate(), today: isoDate(d) === today }
    })
  }, [weekStart, today])

  const reservations: Reservation[] = useMemo(() => {
    const isoDays = Array.from({ length: 7 }, (_, i) => isoDate(addDays(weekStart, i)))
    return bookings.flatMap((b) => {
      if (b.status === 'CANCELLED') return []
      const dayIndex = isoDays.indexOf(b.startAt.slice(0, 10))
      if (dayIndex === -1) return []
      const status: Reservation['status'] = PAID.has(b.status) ? 'confirmed' : 'pending'
      return [
        {
          id: String(b.id),
          day: dayIndex,
          startHour: hourOf(b.startAt),
          endHour: hourOf(b.endAt),
          status,
          team: b.playerName,
          detail: b.courtName,
          booking: b,
        },
      ]
    })
  }, [bookings, weekStart])

  const weekLabel = `${weekStart.getDate()} – ${addDays(weekStart, 6).getDate()}`
  const monthLabel = weekStart.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const dayTitle = date === today ? 'Agenda de hoy' : `Agenda del ${dayChip(date, today).toLowerCase()}`

  const kpi = 'rounded-[18px] border border-line bg-surface px-[18px] py-4'

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-7">
      {/* Encabezado y días */}
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <h1 className="text-[clamp(26px,2.6vw,34px)] leading-[1.05] font-extrabold tracking-[-0.03em] text-fg">
          {dayTitle}
          <small className="mt-1 block text-[15px] font-medium tracking-normal text-fg-2">
            {activeBusiness?.name ?? ''} · {dayList.length} {dayList.length === 1 ? 'reserva' : 'reservas'} ·{' '}
            {freeCount} {freeCount === 1 ? 'hora libre' : 'horas libres'}
          </small>
        </h1>
        <Button onClick={openNewReserva} className="rounded-[12px] font-extrabold">
          <IconPlus />
          Reserva manual
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Día de la agenda">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === date}
            onClick={() => setDate(d)}
            className={clsx(
              'rounded-[10px] border px-3 py-[7px] text-[14px] font-bold transition-colors cursor-pointer',
              d === date ? 'border-fg bg-fg text-bg' : 'border-line bg-surface text-fg-2 hover:text-fg'
            )}
          >
            {dayChip(d, today)}
          </button>
        ))}
      </div>

      {/* KPIs del día */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={kpi}>
          <small className="text-[13px] font-bold text-fg-2">Ocupación</small>
          <b className="num my-1 block text-[30px] font-extrabold tracking-[-0.03em] text-fg">
            {loading ? '—' : `${occupancy} %`}
          </b>
          <span className="num text-[13px] text-fg-2">
            {Math.round(bookedH * 10) / 10} de {Math.round(openH * 10) / 10} horas
          </span>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded bg-line">
            <i className="block h-full rounded bg-botella" style={{ width: `${occupancy}%` }} />
          </div>
        </div>
        <div className={kpi}>
          <small className="text-[13px] font-bold text-fg-2">Ingresos del día</small>
          <b className="num my-1 block text-[30px] font-extrabold tracking-[-0.03em] text-fg">
            {loading ? '—' : formatCOP(income)}
          </b>
          <span className="text-[13px] text-fg-2">según la tarifa por hora</span>
        </div>
        <div className={kpi}>
          <small className="text-[13px] font-bold text-fg-2">Pagadas</small>
          <b className="num my-1 block text-[30px] font-extrabold tracking-[-0.03em] text-fg">
            {loading ? '—' : paidList.length}
          </b>
          <span className="num text-[13px] font-bold text-[#1F8A5B]">{formatCOP(paidAmount)} recibidos</span>
        </div>
        <div className={kpi}>
          <small className="text-[13px] font-bold text-fg-2">Pendientes de pago</small>
          <b className="num my-1 block text-[30px] font-extrabold tracking-[-0.03em] text-fg">
            {loading ? '—' : pendingList.length}
          </b>
          <span className="num text-[13px] text-fg-2">{formatCOP(pendingAmount)} por cobrar</span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* Canchas por hora */}
        <section className="overflow-hidden rounded-[20px] border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-[18px] py-3.5">
            <b className="text-[18px] font-extrabold tracking-[-0.01em] text-fg">Canchas por hora</b>
            <div className="flex flex-wrap gap-3 text-[13px] text-fg-2">
              <span>
                <i className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-[#1F8A5B] align-[-1px]" />
                Pagada
              </span>
              <span>
                <i className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-[#E5A400] align-[-1px]" />
                Pendiente de pago
              </span>
              <span>
                <i className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-line align-[-1px]" />
                Libre
              </span>
            </div>
          </header>

          {loading ? (
            <div className="p-4">
              <Skeleton className="h-[420px] rounded-[14px]" />
            </div>
          ) : avs.length === 0 ? (
            <p className="px-[18px] py-10 text-center text-fg-2">Este complejo todavía no tiene canchas.</p>
          ) : (
            <div className="max-h-[640px] overflow-auto">
              <div
                className="grid min-w-max"
                style={{ gridTemplateColumns: `72px repeat(${avs.length}, minmax(150px, 1fr))` }}
              >
                <div className="sticky top-0 left-0 z-30 border-b border-line bg-surface-2" />
                {avs.map((a) => (
                  <div
                    key={a.court.id}
                    className="sticky top-0 z-20 truncate border-b border-line bg-surface-2 px-2.5 py-2 text-[13px] font-bold text-fg"
                  >
                    {a.court.name}
                  </div>
                ))}

                {rows.map((h, r) => (
                  <Fragment key={h}>
                    <div
                      className={clsx(
                        'num sticky left-0 z-10 border-r border-b border-line bg-surface px-2.5 py-2 text-[13px] font-bold whitespace-nowrap text-fg-2',
                        h === nowHour && 'shadow-[inset_0_-3px_0_#C8483B]'
                      )}
                      style={{ gridRow: r + 2, gridColumn: 1 }}
                    >
                      {formatHour(h)}
                    </div>
                    {avs.map((a, c) => {
                      const hours = openingHours(a, date)
                      const covered = dayBookings(a, date).some(
                        (b) => hourOf(b.startAt) < h + 1 && hourOf(b.endAt) > h
                      )
                      if (covered) return null
                      const isOpen = hours && h >= hours.open && h + 1 <= hours.close
                      const past = date < today || (date === today && h <= nowHour)
                      return (
                        <div
                          key={a.court.id}
                          className="border-b border-line"
                          style={{ gridRow: r + 2, gridColumn: c + 2 }}
                        >
                          {isOpen ? (
                            <button
                              type="button"
                              onClick={openNewReserva}
                              disabled={past}
                              className={clsx(
                                'm-[3px] grid min-h-[50px] w-[calc(100%-6px)] place-items-center rounded-[10px] border border-dashed border-line text-[13px] font-bold text-fg-3',
                                'bg-[repeating-linear-gradient(45deg,var(--surface-2)_0_8px,var(--bg)_8px_16px)]',
                                past
                                  ? 'cursor-default opacity-45'
                                  : 'cursor-pointer transition-colors hover:border-accent hover:text-accent-text'
                              )}
                            >
                              Libre
                            </button>
                          ) : (
                            <div className="m-[3px] grid min-h-[50px] place-items-center rounded-[10px] text-[12px] text-fg-3">
                              Cerrado
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </Fragment>
                ))}

                {/* Reservas: un bloque por reserva, del alto de sus horas */}
                {avs.map((a, c) =>
                  dayBookings(a, date).map((b) => {
                    const s = hourOf(b.startAt)
                    const e = hourOf(b.endAt)
                    const row = Math.floor(s) - first + 2
                    const span = Math.max(1, Math.ceil(e) - Math.floor(s))
                    const past = new Date(b.endAt).getTime() < now
                    return (
                      <div
                        key={b.id}
                        className="border-b border-line"
                        style={{ gridRow: `${row} / span ${span}`, gridColumn: c + 2 }}
                      >
                        <button
                          type="button"
                          onClick={() => setDetailBooking(b)}
                          className={clsx(
                            'm-[3px] block h-[calc(100%-6px)] min-h-[50px] w-[calc(100%-6px)] rounded-[10px] px-[9px] py-[7px] text-left text-[13px] leading-tight transition-transform hover:-translate-y-px cursor-pointer',
                            PAID.has(b.status) ? BLOCK.paid : BLOCK.pending,
                            past && 'opacity-45'
                          )}
                        >
                          <b className="block truncate text-[13.5px] font-extrabold">{b.playerName}</b>
                          <span className="num text-fg-2">
                            {formatHour(s)}–{formatHour(e)} · {PAID.has(b.status) ? 'Pagada' : 'Pendiente'}
                          </span>
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </section>

        {/* Próximas reservas */}
        <section className="overflow-hidden rounded-[20px] border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-[18px] py-3.5">
            <b className="text-[18px] font-extrabold tracking-[-0.01em] text-fg">Próximas reservas</b>
            <span className="text-[13px] text-fg-2">{upcoming.length} en total</span>
          </header>
          {upcoming.length === 0 ? (
            <p className="px-[18px] py-10 text-center text-fg-2">
              {loading ? 'Cargando…' : 'No hay reservas próximas.'}
            </p>
          ) : (
            <ul className="max-h-[560px] overflow-auto">
              {upcoming.slice(0, 30).map((b) => (
                <li key={b.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setDetailBooking(b)}
                    className="grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 px-[18px] py-3 text-left transition-colors hover:bg-surface-2 cursor-pointer"
                  >
                    <span className="grid size-[42px] place-items-center rounded-[12px] bg-accent-soft font-extrabold text-accent-text">
                      {initials(b.playerName)}
                    </span>
                    <span className="min-w-0">
                      <b className="block truncate font-extrabold text-fg">{b.playerName}</b>
                      <small className="num block truncate text-[13.5px] text-fg-2">
                        {dayChip(b.startAt.slice(0, 10), today)} · {formatHour(hourOf(b.startAt))}–
                        {formatHour(hourOf(b.endAt))} · {b.courtName}
                      </small>
                    </span>
                    <span
                      className={clsx(
                        'rounded-full px-[9px] py-1 text-[12px] font-extrabold whitespace-nowrap',
                        PAID.has(b.status) ? 'bg-success-soft text-[#1F8A5B]' : 'bg-warning-soft text-warning'
                      )}
                    >
                      {PAID.has(b.status) ? 'Pagada' : 'Pendiente'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* La semana completa */}
      <WeekCalendar
        days={weekDays}
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
        pricePerHour={detailBooking ? priceOf(detailBooking.courtId) : undefined}
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
