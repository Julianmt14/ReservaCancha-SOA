'use client'

import { useEffect, useState } from 'react'
import type { CourtResponse, ScheduleResponse } from '@/lib/api/courts'
import type { BookingResponse } from '@/lib/api/bookings'
import { getSchedules } from '@/lib/api/courts'
import { getBookingsByCourt } from '@/lib/api/bookings'
import CreateReservaModal from '@/components/app/reservas/CreateReservaModal'
import CourtWeekCalendar from './CourtWeekCalendar'
import { useAuth } from '@/lib/auth/context'

const SPORT_LABEL: Record<string, string> = {
  FUTBOL: 'Fútbol',
  PADEL: 'Pádel',
  VOLEIBOL: 'Voleibol',
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-CO')
}

interface Props {
  court: CourtResponse
  onBack: () => void
}

export default function CourtDetail({ court, onBack }: Props) {
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [preselDate, setPreselDate] = useState('')
  const [preselStart, setPreselStart] = useState('')
  const [preselEnd, setPreselEnd] = useState('')
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([])
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loadingCal, setLoadingCal] = useState(true)

  function openWithSlot(date: string, startHour: number) {
    const pad = (n: number) => String(Math.floor(n)).padStart(2, '0') + ':00'
    setPreselDate(date)
    setPreselStart(pad(startHour))
    setPreselEnd(pad(startHour + 1))
    setModalOpen(true)
  }

  useEffect(() => {
    setLoadingCal(true)
    Promise.all([
      getSchedules(court.id).catch(() => [] as ScheduleResponse[]),
      getBookingsByCourt(court.id).catch(() => ({ content: [] as BookingResponse[] })),
    ])
      .then(([s, b]) => {
        setSchedules(s)
        setBookings(b.content)
      })
      .finally(() => setLoadingCal(false))
  }, [court.id])

  function handleSaved(booking: BookingResponse) {
    setBookings((prev) => [...prev, booking])
    setModalOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 p-7">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] cursor-pointer transition-colors w-fit"
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
        Volver a canchas
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
              {court.name}
            </h1>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: 'var(--green-soft)', color: 'var(--green)' }}
            >
              {SPORT_LABEL[court.sportType] ?? court.sportType}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: court.active ? 'var(--green)' : 'var(--red)' }}
              />
              <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                {court.active ? 'Disponible' : 'No disponible'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-2)' }}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--text-3)', flexShrink: 0 }}
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {court.address}
            </div>
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-2)' }}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--text-3)', flexShrink: 0 }}
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {court.businessName}
            </div>
            {court.description && (
              <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-2)' }}>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: 'var(--text-3)', flexShrink: 0 }}
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                {court.description}
              </div>
            )}
          </div>
        </div>

        {/* Price + CTA */}
        <div
          className="flex items-center gap-4 rounded-xl px-5 py-4 shrink-0"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
              Precio por hora
            </div>
            <div className="text-[24px] font-bold font-mono leading-tight" style={{ color: 'var(--green)' }}>
              {fmt(court.pricePerHour)}
              <span className="text-[12px] font-normal ml-1" style={{ color: 'var(--text-3)' }}>
                COP
              </span>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            disabled={!court.active}
            className="px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--green)', color: '#fff' }}
            onMouseEnter={(e) => {
              if (court.active) e.currentTarget.style.background = 'var(--green-deep)'
            }}
            onMouseLeave={(e) => {
              if (court.active) e.currentTarget.style.background = 'var(--green)'
            }}
          >
            Reservar
          </button>
        </div>
      </div>

      {/* Calendar */}
      {loadingCal ? (
        <div className="h-[500px] rounded-[14px] animate-pulse" style={{ background: 'var(--panel)' }} />
      ) : (
        <CourtWeekCalendar
          court={court}
          schedules={schedules}
          bookings={bookings}
          currentUserId={user?.userId}
          onReserve={() => {
            setPreselDate('')
            setPreselStart('')
            setPreselEnd('')
            setModalOpen(true)
          }}
          onSlotClick={openWithSlot}
        />
      )}

      <CreateReservaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        preselectedCourtId={court.id}
        preselectedDate={preselDate}
        preselectedStart={preselStart}
        preselectedEnd={preselEnd}
      />
    </div>
  )
}
