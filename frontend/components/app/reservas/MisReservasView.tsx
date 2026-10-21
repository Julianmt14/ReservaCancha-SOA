'use client'

import { useEffect, useState, useMemo } from 'react'
import { getMyBookings, cancelBooking, type BookingResponse } from '@/lib/api/bookings'
import { getCourt, type CourtResponse } from '@/lib/api/courts'
import ReservaStatusBadge from './ReservaStatusBadge'
import BookingDetailModal from './BookingDetailModal'
import type { ReservationStatus } from '@/lib/types/dashboard'

const STATUS_MAP: Record<BookingResponse['status'], ReservationStatus> = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'canceled',
  COMPLETED: 'confirmed',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Filter = 'all' | 'confirmed' | 'pending' | 'canceled'

const FILTER_TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'canceled', label: 'Canceladas' },
]

export default function MisReservasView() {
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [canceling, setCanceling] = useState<number | null>(null)
  const [detailBooking, setDetailBooking] = useState<BookingResponse | null>(null)
  const [detailCourt, setDetailCourt] = useState<CourtResponse | null>(null)
  const [courtLoading, setCourtLoading] = useState(false)
  const courtCache = useMemo(() => new Map<number, CourtResponse>(), [])

  useEffect(() => {
    getMyBookings(0, 100)
      .then((p) => setBookings(p.content))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return bookings
    return bookings.filter((b) => STATUS_MAP[b.status] === filter)
  }, [bookings, filter])

  async function handleCancel(id: number) {
    setCanceling(id)
    try {
      const updated = await cancelBooking(id)
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)))
    } catch {
      // silently ignore
    } finally {
      setCanceling(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-2)' }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer"
            style={{
              background: filter === tab.value ? 'var(--panel-2)' : 'transparent',
              color: filter === tab.value ? 'var(--text)' : 'var(--text-3)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
                {['Cancha', 'Fecha', 'Horario', 'Código', 'Estado', ''].map((h) => (
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
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? 'var(--panel)' : 'var(--panel-2)',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-3 rounded animate-pulse"
                          style={{ background: 'var(--line-2)', width: j === 5 ? '60px' : '80%' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-xs"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {filter === 'all' ? 'Aún no tienes reservas.' : 'No hay reservas en esta categoría.'}
                  </td>
                </tr>
              ) : (
                filtered.map((b, i) => {
                  const status = STATUS_MAP[b.status]
                  const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED'
                  return (
                    <tr
                      key={b.id}
                      onClick={() => {
                        const cached = courtCache.get(b.courtId)
                        if (cached) {
                          setDetailCourt(cached)
                          setDetailBooking(b)
                          setCourtLoading(false)
                          return
                        }
                        setDetailCourt(null)
                        setDetailBooking(b)
                        setCourtLoading(true)
                        getCourt(b.courtId)
                          .then((court) => {
                            courtCache.set(court.id, court)
                            setDetailCourt(court)
                          })
                          .catch(() => setDetailCourt(null))
                          .finally(() => setCourtLoading(false))
                      }}
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
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                          {b.courtName}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>
                        {formatDate(b.startAt)}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs whitespace-nowrap"
                        style={{ color: 'var(--text)' }}
                      >
                        {formatTime(b.startAt)}–{formatTime(b.endAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-3)' }}>
                        {b.bookingCode}
                      </td>
                      <td className="px-4 py-3">
                        <ReservaStatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">
                        {canCancel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancel(b.id)
                            }}
                            disabled={canceling === b.id}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-40"
                            style={{ color: 'var(--red)', background: 'var(--red-soft)' }}
                          >
                            {canceling === b.id ? '…' : 'Cancelar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <BookingDetailModal
        open={detailBooking !== null}
        onClose={() => {
          setDetailBooking(null)
          setDetailCourt(null)
        }}
        booking={detailBooking}
        pricePerHour={detailCourt?.pricePerHour}
        ownerName={detailCourt?.businessName}
        courtLoading={courtLoading}
        showGoToCourt
      />
    </div>
  )
}
