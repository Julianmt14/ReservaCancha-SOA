'use client'

import { useEffect, useState, useMemo } from 'react'
import { getCourts, type CourtResponse } from '@/lib/api/courts'
import { getBookingsByCourt, cancelBooking, type BookingResponse } from '@/lib/api/bookings'
import { useBusiness } from '@/lib/context/business-context'
import BookingDetailModal from './BookingDetailModal'
import CreateReservaModal from './CreateReservaModal'
import { IconPlus, IconSearch } from '@/components/app/icons'

// ─── helpers ────────────────────────────────────────────────────────────────

function localIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmt(n: number) {
  return '$' + n.toLocaleString('es-CO')
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

// ─── status ─────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pendiente', color: 'var(--amber)', bg: 'rgba(242,181,68,0.14)' },
  CONFIRMED: { label: 'Confirmada', color: 'var(--blue)', bg: 'rgba(76,141,245,0.14)' },
  COMPLETED: { label: 'Completada', color: 'var(--green)', bg: 'rgba(27,158,75,0.14)' },
  CANCELLED: { label: 'Cancelada', color: 'var(--red)', bg: 'rgba(229,72,77,0.14)' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.PENDING
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

// ─── Listado tab ─────────────────────────────────────────────────────────────

function ListadoTab({
  bookings,
  courts,
  onDetail,
  onCancelDone,
}: {
  bookings: BookingResponse[]
  courts: CourtResponse[]
  onDetail: (b: BookingResponse) => void
  onCancelDone: (b: BookingResponse) => void
}) {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [courtFilter, setCourtFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [canceling, setCanceling] = useState<number | null>(null)
  const PAGE_SIZE = 12

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
      if (courtFilter !== 'ALL' && String(b.courtId) !== courtFilter) return false
      if (dateFrom && localIsoDate(new Date(b.startAt)) < dateFrom) return false
      if (dateTo && localIsoDate(new Date(b.startAt)) > dateTo) return false
      if (
        q &&
        !b.playerName.toLowerCase().includes(q) &&
        !b.courtName.toLowerCase().includes(q) &&
        !b.bookingCode.toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [bookings, statusFilter, courtFilter, dateFrom, dateTo, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleCancel(e: React.MouseEvent, b: BookingResponse) {
    e.stopPropagation()
    if (!confirm(`¿Cancelar la reserva ${b.bookingCode}?`)) return
    setCanceling(b.id)
    try {
      const updated = await cancelBooking(b.id)
      onCancelDone(updated)
    } catch {
      /* ignore */
    } finally {
      setCanceling(null)
    }
  }

  // stats rápidos
  const today = localIsoDate(new Date())
  const hoy = bookings.filter((b) => localIsoDate(new Date(b.startAt)) === today && b.status !== 'CANCELLED')
  const pendientes = bookings.filter((b) => b.status === 'PENDING')
  const confirmadas = bookings.filter((b) => b.status === 'CONFIRMED')
  const ingresos = bookings
    .filter((b) => localIsoDate(new Date(b.startAt)) === today && b.status !== 'CANCELLED')
    .reduce((acc, b) => {
      const court = courts.find((c) => c.id === b.courtId)
      if (!court) return acc
      const h = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3600000
      return acc + court.pricePerHour * h
    }, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Stats rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Reservas hoy', value: hoy.length, color: 'var(--green)' },
          { label: 'Pendientes', value: pendientes.length, color: 'var(--amber)' },
          { label: 'Confirmadas', value: confirmadas.length, color: 'var(--blue)' },
          { label: 'Ingresos hoy', value: fmt(ingresos), color: 'var(--green)' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
          >
            <div className="text-[10.5px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>
              {s.label}
            </div>
            <div className="text-[20px] font-bold font-mono" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-2)' }}>
          {[
            ['ALL', 'Todas'],
            ['PENDING', 'Pendientes'],
            ['CONFIRMED', 'Confirmadas'],
            ['CANCELLED', 'Canceladas'],
            ['COMPLETED', 'Completadas'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => {
                setStatusFilter(v)
                setPage(1)
              }}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium cursor-pointer"
              style={{
                background: statusFilter === v ? 'var(--panel-2)' : 'transparent',
                color: statusFilter === v ? 'var(--text)' : 'var(--text-3)',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Cancha */}
        <select
          value={courtFilter}
          onChange={(e) => {
            setCourtFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg px-3 py-2 text-[12px] outline-none cursor-pointer"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
        >
          <option value="ALL">Todas las canchas</option>
          {courts.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Fechas */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
          className="rounded-lg px-3 py-2 text-[12px] outline-none cursor-pointer"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(1)
          }}
          className="rounded-lg px-3 py-2 text-[12px] outline-none cursor-pointer"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
        />

        {/* Búsqueda */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-3)' }}
        >
          <IconSearch />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Jugador, cancha, código…"
            className="bg-transparent outline-none text-[12px] w-40"
            style={{ color: 'var(--text)' }}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
              {['Código', 'Jugador', 'Cancha', 'Fecha', 'Horario', 'Estado', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em]"
                  style={{ color: 'var(--text-3)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs" style={{ color: 'var(--text-3)' }}>
                  No hay reservas con esos filtros.
                </td>
              </tr>
            ) : (
              slice.map((b, i) => (
                <tr
                  key={b.id}
                  onClick={() => onDetail(b)}
                  style={{
                    background: i % 2 === 0 ? 'var(--panel)' : 'var(--panel-2)',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = i % 2 === 0 ? 'var(--panel)' : 'var(--panel-2)')
                  }
                >
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {b.bookingCode}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] font-medium" style={{ color: 'var(--text)' }}>
                    {b.playerName}
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-2)' }}>
                    {b.courtName}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px]" style={{ color: 'var(--text-2)' }}>
                    {fmtDate(b.startAt)}
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-[12px] whitespace-nowrap"
                    style={{ color: 'var(--text)' }}
                  >
                    {fmtTime(b.startAt)}–{fmtTime(b.endAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3">
                    {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                      <button
                        onClick={(e) => handleCancel(e, b)}
                        disabled={canceling === b.id}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-40"
                        style={{ color: 'var(--red)', background: 'var(--red-soft)' }}
                      >
                        {canceling === b.id ? '…' : 'Cancelar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 text-xs"
            style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--text-3)' }}
          >
            <span>
              {filtered.length} reservas · pág. {page}/{totalPages}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="size-7 rounded-md text-xs font-medium cursor-pointer"
                  style={{
                    background: p === page ? 'var(--green)' : 'transparent',
                    color: p === page ? '#fff' : 'var(--text-3)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Agenda tab ───────────────────────────────────────────────────────────────

const HOUR_START = 6
const HOUR_END = 24
const TOTAL_H = HOUR_END - HOUR_START

function AgendaTab({
  bookings,
  courts,
  onDetail,
}: {
  bookings: BookingResponse[]
  courts: CourtResponse[]
  onDetail: (b: BookingResponse) => void
}) {
  const [selectedDate, setSelectedDate] = useState(localIsoDate(new Date()))

  const dayBookings = useMemo(
    () =>
      bookings.filter((b) => localIsoDate(new Date(b.startAt)) === selectedDate && b.status !== 'CANCELLED'),
    [bookings, selectedDate]
  )

  const activeCourts = useMemo(() => {
    const ids = new Set(dayBookings.map((b) => b.courtId))
    return courts.filter((c) => c.active || ids.has(c.id))
  }, [courts, dayBookings])

  const hours = Array.from({ length: TOTAL_H }, (_, i) => HOUR_START + i)

  function pct(h: number) {
    return ((h - HOUR_START) / TOTAL_H) * 100
  }

  const today = localIsoDate(new Date())
  const prev = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(localIsoDate(d))
  }
  const next = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(localIsoDate(d))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Date nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={prev}
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
          onClick={next}
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
        <span className="font-semibold text-[15px] capitalize" style={{ color: 'var(--text)' }}>
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
        <button
          onClick={() => setSelectedDate(today)}
          className="px-3 py-[5px] rounded-lg text-[12px] font-semibold cursor-pointer"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)' }}
        >
          Hoy
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg px-3 py-[5px] text-[12px] outline-none cursor-pointer"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
        />
        <div className="flex items-center gap-4 ml-auto text-[11.5px]" style={{ color: 'var(--text-3)' }}>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: 'rgba(242,181,68,0.3)', border: '1px solid rgba(242,181,68,0.6)' }}
            />
            Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: 'rgba(76,141,245,0.3)', border: '1px solid rgba(76,141,245,0.6)' }}
            />
            Confirmada
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: 'rgba(27,158,75,0.3)', border: '1px solid rgba(27,158,75,0.6)' }}
            />
            Completada
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        {activeCourts.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-3)' }}>
            No hay canchas para mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(600, 80 + activeCourts.length * 160) }}>
              {/* Header */}
              <div
                className="flex"
                style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}
              >
                <div className="shrink-0 w-16" />
                {activeCourts.map((c) => (
                  <div
                    key={c.id}
                    className="flex-1 px-3 py-3 text-center"
                    style={{ borderLeft: '1px solid var(--line)', minWidth: 140 }}
                  >
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                      {c.name}
                    </div>
                    <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {dayBookings.filter((b) => b.courtId === c.id).length} reservas
                    </div>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="flex relative" style={{ height: TOTAL_H * 56 }}>
                {/* Hour labels */}
                <div className="shrink-0 w-16">
                  {hours.map((h) => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        top: `calc(${pct(h)}% + 3px)`,
                        left: 0,
                        width: 56,
                        color: 'var(--text-3)',
                      }}
                      className="text-right pr-3 text-[11px] font-mono"
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Court columns */}
                {activeCourts.map((c) => {
                  const col = dayBookings.filter((b) => b.courtId === c.id)
                  return (
                    <div
                      key={c.id}
                      className="flex-1 relative"
                      style={{ borderLeft: '1px solid var(--line)', minWidth: 140 }}
                    >
                      {/* Hour lines */}
                      {hours.map((h) => (
                        <div
                          key={h}
                          style={{
                            position: 'absolute',
                            top: pct(h) + '%',
                            left: 0,
                            right: 0,
                            height: 1,
                            background: 'var(--line)',
                          }}
                        />
                      ))}
                      {/* Bookings */}
                      {col.map((b) => {
                        const s = new Date(b.startAt),
                          e = new Date(b.endAt)
                        const sh = s.getHours() + s.getMinutes() / 60
                        const eh = e.getHours() + e.getMinutes() / 60
                        const top = pct(sh)
                        const height = pct(eh) - pct(sh)
                        const st = STATUS[b.status] ?? STATUS.PENDING
                        return (
                          <div
                            key={b.id}
                            onClick={() => onDetail(b)}
                            className="absolute left-[3px] right-[3px] rounded-md px-2 py-1 overflow-hidden cursor-pointer"
                            style={{
                              top: `${top}%`,
                              height: `${height}%`,
                              background: st.bg,
                              border: `1px solid ${st.color}33`,
                              boxShadow: `inset 3px 0 0 ${st.color}`,
                            }}
                          >
                            <div
                              className="text-[10px] font-semibold leading-tight truncate"
                              style={{ color: st.color }}
                            >
                              {b.playerName}
                            </div>
                            {eh - sh >= 0.75 && (
                              <div
                                className="text-[9.5px] font-mono"
                                style={{ color: st.color, opacity: 0.8 }}
                              >
                                {fmtTime(b.startAt)}–{fmtTime(b.endAt)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main loader ─────────────────────────────────────────────────────────────

export default function AdminReservasLoader() {
  const { activeBusiness } = useBusiness()
  const [courts, setCourts] = useState<CourtResponse[]>([])
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'listado' | 'agenda'>('listado')
  const [detailBooking, setDetailBooking] = useState<BookingResponse | null>(null)
  const [detailCourt, setDetailCourt] = useState<CourtResponse | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const cs = await getCourts(0, 100)
      const bizCourts = cs.content.filter((c) => c.businessId === activeBusiness.id)
      setCourts(bizCourts)
      const pages = await Promise.all(
        bizCourts.map((c) =>
          getBookingsByCourt(c.id, 0, 200).catch(() => ({ content: [] as BookingResponse[] }))
        )
      )
      const all = pages.flatMap((p) => p.content)
      all.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
      setBookings(all)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [activeBusiness?.id])

  function handleCancelDone(updated: BookingResponse) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }

  function handleDetail(b: BookingResponse) {
    setDetailBooking(b)
    setDetailCourt(courts.find((c) => c.id === b.courtId) ?? null)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
            Reservas
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            {activeBusiness?.name} · gestión y agenda de reservas
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer"
          style={{ background: 'var(--green)', color: '#fff' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--green-deep)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--green)')}
        >
          <IconPlus /> Nueva reserva
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-2)' }}>
        {(
          [
            ['listado', 'Listado'],
            ['agenda', 'Agenda'],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className="px-5 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-colors"
            style={{
              background: tab === v ? 'var(--panel-2)' : 'transparent',
              color: tab === v ? 'var(--text)' : 'var(--text-3)',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--panel)' }} />
            ))}
          </div>
          <div className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--panel)' }} />
        </div>
      ) : tab === 'listado' ? (
        <ListadoTab
          bookings={bookings}
          courts={courts}
          onDetail={handleDetail}
          onCancelDone={handleCancelDone}
        />
      ) : (
        <AgendaTab bookings={bookings} courts={courts} onDetail={handleDetail} />
      )}

      <BookingDetailModal
        open={detailBooking !== null}
        onClose={() => setDetailBooking(null)}
        booking={detailBooking}
        pricePerHour={detailCourt?.pricePerHour}
        ownerName={detailCourt?.businessName}
      />

      <CreateReservaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(b) => {
          setBookings((prev) => [b, ...prev])
          setModalOpen(false)
        }}
      />
    </div>
  )
}
