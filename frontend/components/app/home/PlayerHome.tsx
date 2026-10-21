'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import DateStrip from '@/components/ui/DateStrip'
import Chip from '@/components/ui/Chip'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import { useVenues } from '@/components/app/booking/useVenues'
import { DAY_PART_LABEL, freeCount, nextDays, type DayPart } from '@/components/app/booking/availability'
import { isoDate } from '@/lib/format'
import VenueCard from './VenueCard'
import CourtCard from './CourtCard'
import VenueDetail, { type VenueSelection } from './VenueDetail'

type View = { businessId: number; initial: VenueSelection } | null

const PARTS: (DayPart | 'all')[] = ['all', 'manana', 'tarde', 'noche']

/**
 * Lee la cancha/fecha que dejó otra pantalla ("Ver horario de la cancha", "Reservar de nuevo").
 * El componente solo se monta en el cliente (el shell espera a la sesión), así que es seguro leer
 * sessionStorage en el inicializador.
 */
function consumeHandoff(): { view: View; date: string } {
  const today = isoDate(new Date())
  if (typeof window === 'undefined') return { view: null, date: today }
  const courtId = sessionStorage.getItem('openCourtId')
  const when = sessionStorage.getItem('openCourtWeekDate')
  sessionStorage.removeItem('openCourtId')
  sessionStorage.removeItem('openCourtWeekDate')
  if (!courtId) return { view: null, date: today }
  const d = when ? when.slice(0, 10) : today
  const date = d >= today ? d : today
  const start = when && d >= today ? new Date(when).getHours() : undefined
  return { view: { businessId: -1, initial: { courtId: Number(courtId), start } }, date }
}

export default function PlayerHome() {
  const { user } = useAuth()
  const { venues, loading, error, reload } = useVenues()
  const [handoff] = useState(consumeHandoff)
  const [view, setView] = useState<View>(handoff.view)
  const [date, setDate] = useState(handoff.date)
  const [part, setPart] = useState<DayPart | 'all'>('all')
  const days = nextDays()

  const firstName = user?.fullName?.split(' ')[0] ?? ''

  // Vista de complejo (si llegó una cancha por handoff, se resuelve su complejo al cargar)
  const venue = view
    ? (venues.find((v) => v.businessId === view.businessId) ??
      venues.find((v) => v.courts.some((c) => c.court.id === view.initial.courtId)))
    : undefined

  if (view && venue) {
    return (
      <VenueDetail
        venue={venue}
        date={date}
        onDateChange={setDate}
        initial={view.initial}
        onBack={() => {
          setView(null)
          window.scrollTo({ top: 0 })
        }}
        onChanged={reload}
      />
    )
  }

  function open(businessId: number, initial: VenueSelection = {}) {
    setView({ businessId, initial })
    window.scrollTo({ top: 0 })
  }

  const allCourts = venues.flatMap((v) => v.courts)
  const soldOut = new Set(days.filter((d) => allCourts.length > 0 && freeCount(allCourts, d) === 0))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-10">
      {/* Encabezado */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[15px] text-fg-2">Hola{firstName ? `, ${firstName}` : ''}</p>
          <h1 className="text-display mt-2 text-[44px] text-fg sm:text-[64px] lg:text-[76px]">
            ¿Dónde jugamos <span className="text-accent-text">hoy?</span>
          </h1>
        </div>
        <span className="mb-2 hidden items-center gap-2 text-[12.5px] whitespace-nowrap text-fg-2 sm:flex">
          <i className="size-2 rounded-full bg-success ring-4 ring-success/20" />
          Disponibilidad en tiempo real
        </span>
      </div>

      {/* Día y franja (fijos bajo la barra superior) */}
      <div className="sticky top-14 z-30 -mx-4 mt-5 border-b border-line bg-bg/90 px-4 pt-3 pb-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-16 lg:-mx-8 lg:px-8">
        <DateStrip days={days} value={date} onChange={setDate} soldOut={soldOut} />
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {PARTS.map((p) => (
            <Chip key={p} size="sm" selected={part === p} onClick={() => setPart(p)}>
              {p === 'all' ? 'Todo el día' : DAY_PART_LABEL[p]}
            </Chip>
          ))}
        </div>
      </div>

      {loading && (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Skeleton className="h-[440px] rounded-[24px]" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[112px] rounded-[20px]" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <EmptyState
          className="mt-6"
          tone="danger"
          title="No pudimos cargar las canchas"
          description="Revisa tu conexión e intenta de nuevo."
          action={
            <Button variant="secondary" size="sm" onClick={reload}>
              Reintentar
            </Button>
          }
        />
      )}

      {!loading && !error && venues.length === 0 && (
        <EmptyState
          className="mt-6"
          title="Aún no hay canchas publicadas"
          description="Cuando el complejo publique sus canchas, aparecerán aquí con sus horarios libres."
        />
      )}

      {!loading && !error && venues.length > 0 && (
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            {venues.map((v) => (
              <VenueCard
                key={v.businessId}
                venue={v}
                date={date}
                part={part}
                onOpen={() => open(v.businessId)}
                onPickTime={(start) => open(v.businessId, { start })}
              />
            ))}
          </div>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-display text-[26px] text-fg">Canchas</h2>
              <span className="text-[13px] text-fg-3">{allCourts.length} en total</span>
            </div>
            <div className="flex flex-col gap-3">
              {venues.flatMap((v) =>
                v.courts.map((av, i) => (
                  <CourtCard
                    key={av.court.id}
                    availability={av}
                    date={date}
                    part={part}
                    index={i}
                    onOpen={() => open(v.businessId, { courtId: av.court.id })}
                    onPickTime={(start) => open(v.businessId, { courtId: av.court.id, start })}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
