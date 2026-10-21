'use client'

import { useEffect, useState } from 'react'
import type { CourtResponse, ScheduleResponse } from '@/lib/api/courts'
import type { BookingResponse } from '@/lib/api/bookings'
import { getSchedules, deleteSchedule, deleteCourt } from '@/lib/api/courts'
import { getBookingsByCourt } from '@/lib/api/bookings'
import CanchaFormModal from './CanchaFormModal'
import ScheduleGrid from './ScheduleGrid'
import BookingDetailModal from '@/components/app/reservas/BookingDetailModal'
import { FormField, Select } from '@/components/app/ui/FormField'

const SPORT_LABEL: Record<string, string> = {
  FUTBOL: 'Fútbol',
  PADEL: 'Pádel',
  VOLEIBOL: 'Voleibol',
}

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: 'var(--amber)', bg: 'var(--amber-soft)', label: 'Pendiente' },
  CONFIRMED: { color: 'var(--green)', bg: 'var(--green-soft)', label: 'Confirmada' },
  CANCELLED: { color: 'var(--red)', bg: 'var(--red-soft)', label: 'Cancelada' },
  COMPLETED: { color: 'var(--blue)', bg: 'var(--blue-soft)', label: 'Completada' },
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-CO')
}

function formatDT(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  )
}

type Tab = 'info' | 'horarios' | 'reservas'

interface Props {
  court: CourtResponse
  onBack: () => void
  onUpdated: (court: CourtResponse) => void
  onDeleted: (id: number) => void
}

export default function CanchaAdminDetail({ court, onBack, onUpdated, onDeleted }: Props) {
  const [tab, setTab] = useState<Tab>('info')
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([])
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [detailBooking, setDetailBooking] = useState<BookingResponse | null>(null)
  const [scheduleWeek, setScheduleWeek] = useState<Date | undefined>(undefined)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSchedules(court.id).catch(() => [] as ScheduleResponse[]),
      getBookingsByCourt(court.id, 0, 200).catch(() => ({ content: [] as BookingResponse[] })),
    ])
      .then(([s, b]) => {
        setSchedules(s)
        setBookings(b.content)
      })
      .finally(() => setLoading(false))
  }, [court.id])

  async function handleDelete() {
    if (!confirm(`¿Desactivar "${court.name}"? Quedará invisible para los jugadores.`)) return
    setDeleting(true)
    try {
      await deleteCourt(court.id)
      onDeleted(court.id)
    } catch {
      setDeleting(false)
    }
  }

  const filteredBookings =
    statusFilter === 'ALL' ? bookings : bookings.filter((b) => b.status === statusFilter)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Información' },
    { key: 'horarios', label: 'Horarios' },
    { key: 'reservas', label: `Reservas (${bookings.length})` },
  ]

  return (
    <div className="flex flex-col gap-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] cursor-pointer transition-colors"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Canchas
        </button>
        <span style={{ color: 'var(--line-2)' }}>/</span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
          {court.name}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold cursor-pointer"
            style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--line)' }}
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red)' }}
          >
            {deleting ? 'Desactivando…' : 'Desactivar'}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div
        className="px-6 py-6 flex items-start gap-6 flex-wrap"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        {/* Icon placeholder */}
        <div
          className="size-20 rounded-2xl shrink-0 grid place-items-center text-[28px] font-bold"
          style={{
            background: 'var(--green-soft)',
            color: 'var(--green)',
            border: '1px solid rgba(27,158,75,0.25)',
          }}
        >
          {court.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-bold" style={{ color: 'var(--text)' }}>
              {court.name}
            </h1>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: 'var(--green-soft)', color: 'var(--green)' }}
            >
              {SPORT_LABEL[court.sportType] ?? court.sportType}
            </span>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                background: court.active ? 'var(--green-soft)' : 'var(--red-soft)',
                color: court.active ? 'var(--green)' : 'var(--red)',
              }}
            >
              {court.active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
            {court.address}
          </p>
          {court.description && (
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-2)' }}>
              {court.description}
            </p>
          )}
        </div>

        {/* KPIs */}
        <div className="flex gap-3 shrink-0">
          {[
            { label: 'Precio/hora', value: fmt(court.pricePerHour), color: 'var(--green)' },
            {
              label: 'Reservas',
              value: bookings.filter((b) => b.status !== 'CANCELLED').length,
              color: 'var(--blue)',
            },
            {
              label: 'Horarios',
              value: schedules.filter((s) => s.active).length + ' días',
              color: 'var(--amber)',
            },
          ].map((k) => (
            <div
              key={k.label}
              className="flex flex-col gap-0.5 rounded-xl px-4 py-3 text-center"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', minWidth: 90 }}
            >
              <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                {k.label}
              </div>
              <div className="text-[16px] font-bold font-mono" style={{ color: k.color }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-6" style={{ borderBottom: '1px solid var(--line)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-3 text-[13px] font-medium cursor-pointer transition-colors relative"
            style={{ color: tab === t.key ? 'var(--text)' : 'var(--text-3)' }}
          >
            {t.label}
            {tab === t.key && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                style={{ background: 'var(--green)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {/* INFO */}
        {tab === 'info' && (
          <div className="flex flex-col gap-4 max-w-xl">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Nombre', value: court.name },
                { label: 'Deporte', value: SPORT_LABEL[court.sportType] ?? court.sportType },
                { label: 'Precio/hora', value: fmt(court.pricePerHour) + ' COP' },
                { label: 'Estado', value: court.active ? 'Activa' : 'Inactiva' },
                { label: 'Dirección', value: court.address },
                { label: 'Descripción', value: court.description ?? '—' },
              ].map((f) => (
                <div
                  key={f.label}
                  className={`rounded-xl px-4 py-3 ${f.label === 'Dirección' || f.label === 'Descripción' ? 'col-span-2' : ''}`}
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
                >
                  <div
                    className="text-[10.5px] uppercase tracking-wide mb-1"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {f.label}
                  </div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setEditOpen(true)}
              className="w-fit px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer"
              style={{ background: 'var(--green)', color: '#fff' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--green-deep)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--green)')}
            >
              Editar información
            </button>
          </div>
        )}

        {/* HORARIOS */}
        {tab === 'horarios' &&
          (loading ? (
            <div className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--bg-2)' }} />
          ) : (
            <ScheduleGrid
              courtId={court.id}
              schedules={schedules}
              bookings={bookings}
              initialWeekStart={scheduleWeek}
              onSaved={(s) => setSchedules((prev) => [...prev.filter((x) => x.dayOfWeek !== s.dayOfWeek), s])}
              onDeleted={async (id) => {
                await deleteSchedule(court.id, id).catch(() => {})
                setSchedules((prev) => prev.filter((s) => s.id !== id))
              }}
              onBookingClick={(b) => setDetailBooking(b)}
            />
          ))}

        {/* RESERVAS */}
        {tab === 'reservas' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <FormField label="">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: 160 }}
                >
                  <option value="ALL">Todas</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="CONFIRMED">Confirmadas</option>
                  <option value="COMPLETED">Completadas</option>
                  <option value="CANCELLED">Canceladas</option>
                </Select>
              </FormField>
            </div>

            {loading ? (
              <div className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--bg-2)' }} />
            ) : filteredBookings.length === 0 ? (
              <div
                className="rounded-xl px-6 py-10 text-center text-sm"
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  color: 'var(--text-3)',
                }}
              >
                No hay reservas en esta categoría.
              </div>
            ) : (
              <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
                      {['Código', 'Jugador', 'Fecha', 'Horario', 'Estado'].map((h) => (
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
                    {filteredBookings.map((b, i) => {
                      const st = STATUS_STYLE[b.status] ?? STATUS_STYLE.PENDING
                      return (
                        <tr
                          key={b.id}
                          onClick={() => setDetailBooking(b)}
                          style={{
                            background: i % 2 === 0 ? 'var(--panel)' : 'var(--panel-2)',
                            borderBottom: '1px solid var(--line)',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              i % 2 === 0 ? 'var(--panel)' : 'var(--panel-2)')
                          }
                        >
                          <td className="px-4 py-3 font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
                            {b.bookingCode}
                          </td>
                          <td
                            className="px-4 py-3 text-[12.5px] font-medium"
                            style={{ color: 'var(--text)' }}
                          >
                            {b.playerName}
                          </td>
                          <td className="px-4 py-3 font-mono text-[12px]" style={{ color: 'var(--text-2)' }}>
                            {formatDT(b.startAt)}
                          </td>
                          <td
                            className="px-4 py-3 font-mono text-[12px] whitespace-nowrap"
                            style={{ color: 'var(--text)' }}
                          >
                            {new Date(b.startAt).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            –{' '}
                            {new Date(b.endAt).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                              style={{ background: st.bg, color: st.color }}
                            >
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CanchaFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          onUpdated(updated)
          setEditOpen(false)
        }}
        editing={court}
      />

      <BookingDetailModal
        open={detailBooking !== null}
        onClose={() => setDetailBooking(null)}
        booking={detailBooking}
        pricePerHour={court.pricePerHour}
        ownerName={court.businessName}
        onGoToSchedule={() => {
          if (!detailBooking) return
          const d = new Date(detailBooking.startAt)
          const day = d.getDay()
          const monday = new Date(d)
          monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
          monday.setHours(0, 0, 0, 0)
          setScheduleWeek(monday)
          setDetailBooking(null)
          setTab('horarios')
        }}
      />
    </div>
  )
}
