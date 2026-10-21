'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '@/lib/auth/context'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Button, { buttonClasses } from '@/components/ui/Button'
import { IconPin, IconSearch } from '@/components/app/icons'
import { useVenues, type Venue } from '@/components/app/booking/useVenues'
import { courtTypeLabel } from '@/components/app/booking/courtType'
import { mapsUrl } from '@/components/app/booking/share'
import {
  dayPart,
  freeCount,
  nextDays,
  openingHours,
  timeOptions,
  type CourtAvailability,
  type DayPart,
} from '@/components/app/booking/availability'
import { addDays, formatCOP, formatHour, isoDate, parseIsoDate } from '@/lib/format'
import CourtCard from './CourtCard'
import VenueDetail, { type VenueSelection } from './VenueDetail'

type View = { businessId: number; initial: VenueSelection } | null
type Part = DayPart | 'all'
type Order = 'libres' | 'precio'

const PARTS: { value: Part; label: string; phrase: string }[] = [
  { value: 'all', label: 'Cualquier hora', phrase: '' },
  { value: 'manana', label: 'Mañana · 6 a 12', phrase: ' en la mañana' },
  { value: 'tarde', label: 'Tarde · 12 a 6', phrase: ' en la tarde' },
  { value: 'noche', label: 'Noche · 6 a 11', phrase: ' en la noche' },
]

const ORDERS: { value: Order; label: string }[] = [
  { value: 'libres', label: 'Más horarios libres' },
  { value: 'precio', label: 'Precio más bajo' },
]

const PASOS = [
  ['Busca', 'Escoge tipo de cancha, día y hora. Ves solo los horarios que de verdad están libres.'],
  ['Aparta', 'Toca la hora y paga en línea con Nequi, PSE o tarjeta. La hora queda a tu nombre.'],
  ['Juega', 'Muestra tu código de reserva en la cancha y comparte el partido por WhatsApp.'],
]

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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "Hoy", "Mañana", "Jueves 23" (opciones del buscador). */
function dayOption(iso: string, today: string): string {
  if (iso === today) return 'Hoy'
  if (iso === isoDate(addDays(parseIsoDate(today), 1))) return 'Mañana'
  const d = parseIsoDate(iso)
  return `${capitalize(d.toLocaleDateString('es-CO', { weekday: 'long' }))} ${d.getDate()}`
}

/** "hoy", "mañana", "el jueves 23" (frases del resultado). */
function dayPhrase(iso: string, today = isoDate(new Date())): string {
  const opt = dayOption(iso, today)
  return opt === 'Hoy' || opt === 'Mañana' ? opt.toLowerCase() : `el ${opt.toLowerCase()}`
}

/** Apertura más temprana y cierre más tarde del complejo ese día (null si no abre). */
function venueHours(v: Venue, date: string) {
  const hours = v.courts
    .map((c) => openingHours(c, date))
    .filter((h): h is { open: number; close: number } => h !== null)
  if (!hours.length) return null
  return { open: Math.min(...hours.map((h) => h.open)), close: Math.max(...hours.map((h) => h.close)) }
}

function freeStarts(av: CourtAvailability, date: string, part: Part): number[] {
  return timeOptions([av], date, 1)
    .filter((o) => o.free.length > 0 && (part === 'all' || dayPart(o.start) === part))
    .map((o) => o.start)
}

/** Dibujo de la cancha vista desde arriba que decora la portada (como en la propuesta v3). */
function PortadaLines() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 400"
      fill="none"
      stroke="#ffffff"
      strokeOpacity="0.08"
      strokeWidth="3"
      className="pointer-events-none absolute top-[-20%] right-[-10%] h-[140%] w-[70%] -rotate-[8deg]"
    >
      <rect x="20" y="20" width="560" height="360" rx="18" />
      <path d="M300 20v360" />
      <circle cx="300" cy="200" r="60" />
      <path d="M20 120h80v160H20M580 120h-80v160h80" />
    </svg>
  )
}

export default function PlayerHome() {
  const { user } = useAuth()
  const { venues, loading, error, reload } = useVenues()
  const [handoff] = useState(consumeHandoff)
  const [view, setView] = useState<View>(handoff.view)
  const [date, setDate] = useState(handoff.date)
  const [part, setPart] = useState<Part>('all')
  const [type, setType] = useState('')
  const [order, setOrder] = useState<Order>('libres')

  const today = isoDate(new Date())
  const days = nextDays(7)
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

  const allCourts = venues.flatMap((v) => v.courts.map((av) => ({ av, venue: v })))
  const activeCourts = allCourts.filter((c) => c.av.court.active)
  const types = [...new Set(activeCourts.map((c) => courtTypeLabel(c.av.court)))]
  const freeToday = freeCount(
    activeCourts.map((c) => c.av),
    today
  )

  const rows = allCourts
    .filter((c) => !type || courtTypeLabel(c.av.court) === type)
    .map((c, i) => ({ ...c, index: i, free: freeStarts(c.av, date, part) }))
    .sort((a, b) =>
      order === 'precio'
        ? a.av.court.pricePerHour - b.av.court.pricePerHour
        : Number(b.av.court.active) - Number(a.av.court.active) || b.free.length - a.free.length
    )
  const withFree = rows.filter((r) => r.free.length > 0).length
  const partPhrase = PARTS.find((p) => p.value === part)?.phrase ?? ''

  return (
    <div className="flex flex-col pb-12">
      {/* Portada verde con el buscador */}
      <section
        data-zona="verde"
        className="relative overflow-hidden bg-bg px-4 pt-8 pb-14 text-fg sm:px-6 lg:px-8 lg:pt-12 lg:pb-20"
      >
        <PortadaLines />
        <div className="relative mx-auto w-full max-w-6xl">
          <p className="text-[16px] font-medium text-fg-2">Hola{firstName ? `, ${firstName}` : ''}</p>
          <h1 className="text-display mt-3 max-w-[900px] text-[13vw] leading-[0.92] tracking-[-0.035em] sm:text-[64px] lg:text-[clamp(64px,6.4vw,96px)]">
            Tu cancha, a la hora <span className="text-menta">que quieres.</span>
          </h1>
          <p className="mt-4 max-w-[600px] text-[17px] leading-relaxed text-fg-2 sm:text-[19px]">
            {types.length ? types.join(', ') : 'Canchas sintéticas'} en Villavicencio. Mira los horarios que
            de verdad están libres y aparta en segundos, sin llamar ni esperar respuesta.
          </p>

          <form
            data-zona="clara"
            onSubmit={(e) => {
              e.preventDefault()
              document.getElementById('canchas')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="mt-7 grid max-w-[1100px] grid-cols-2 gap-1.5 rounded-[22px] bg-surface p-2.5 text-fg shadow-[0_30px_60px_-30px_rgba(0,0,0,0.5)] lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
          >
            <label className="col-span-2 grid gap-0.5 rounded-[14px] px-3 py-1.5 transition-colors hover:bg-surface-2 sm:px-3.5 sm:py-2 lg:col-span-1">
              <small className="text-[12px] font-bold tracking-[0.08em] text-fg-2 uppercase">
                Tipo de cancha
              </small>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full cursor-pointer border-0 bg-transparent py-0.5 text-[16px] font-bold outline-none sm:text-[17px]"
              >
                <option value="">Todas</option>
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-0.5 rounded-[14px] px-3 py-1.5 transition-colors hover:bg-surface-2 sm:px-3.5 sm:py-2">
              <small className="text-[12px] font-bold tracking-[0.08em] text-fg-2 uppercase">Día</small>
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full cursor-pointer border-0 bg-transparent py-0.5 text-[16px] font-bold outline-none sm:text-[17px]"
              >
                {(days.includes(date) ? days : [date, ...days]).map((d) => (
                  <option key={d} value={d}>
                    {dayOption(d, today)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-0.5 rounded-[14px] px-3 py-1.5 transition-colors hover:bg-surface-2 sm:px-3.5 sm:py-2">
              <small className="text-[12px] font-bold tracking-[0.08em] text-fg-2 uppercase">Hora</small>
              <select
                value={part}
                onChange={(e) => setPart(e.target.value as Part)}
                className="w-full cursor-pointer border-0 bg-transparent py-0.5 text-[16px] font-bold outline-none sm:text-[17px]"
              >
                {PARTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-accent px-6 text-[16px] font-extrabold text-accent-ink transition-colors hover:bg-accent-hover lg:col-span-1 lg:h-auto cursor-pointer"
            >
              <IconSearch />
              Buscar
            </button>
          </form>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 font-medium text-fg-2 sm:flex sm:flex-wrap sm:gap-7">
            <span>
              <b className="num mr-1.5 text-[20px] font-extrabold text-fg">
                {loading ? '—' : activeCourts.length}
              </b>
              {activeCourts.length === 1 ? 'cancha' : 'canchas'}
            </span>
            <span>
              <b className="num mr-1.5 text-[20px] font-extrabold text-fg">{loading ? '—' : types.length}</b>
              {types.length === 1 ? 'tipo de cancha' : 'tipos de cancha'}
            </span>
            <span>
              <b className="num mr-1.5 text-[20px] font-extrabold text-fg">{loading ? '—' : freeToday}</b>
              horarios libres hoy
            </span>
            <span>
              <b className="mr-1.5 text-[20px] font-extrabold text-fg">Wompi</b>
              pago en línea
            </span>
          </div>
        </div>
      </section>

      {/* Resultados */}
      <section
        id="canchas"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pt-8 sm:px-6 lg:px-8 lg:pt-10"
      >
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[380px] rounded-[20px]" />
            ))}
          </div>
        )}

        {!loading && error && (
          <EmptyState
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
            title="Aún no hay canchas publicadas"
            description="Cuando el complejo publique sus canchas, aparecerán aquí con sus horarios libres."
          />
        )}

        {!loading && !error && venues.length > 0 && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3.5">
                <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-fg">
                  {rows.length} {rows.length === 1 ? 'cancha' : 'canchas'}
                  {type ? ` de ${type.toLowerCase()}` : ''}
                  <small className="mt-0.5 block text-[15px] font-medium tracking-normal text-fg-2">
                    {withFree} con horarios libres {dayPhrase(date, today)}
                    {partPhrase}
                  </small>
                </h2>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ordenar">
                  {ORDERS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={order === o.value}
                      onClick={() => setOrder(o.value)}
                      className={clsx(
                        'rounded-full border px-3.5 py-2 text-[14px] font-bold transition-colors cursor-pointer',
                        order === o.value
                          ? 'border-fg bg-fg text-bg'
                          : 'border-line bg-surface text-fg-2 hover:text-fg'
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {rows.length ? (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {rows.map((r) => (
                    <CourtCard
                      key={r.av.court.id}
                      availability={r.av}
                      venueName={r.venue.businessName}
                      free={r.free}
                      dayLabel={dayPhrase(date, today)}
                      index={r.index}
                      onOpen={() => open(r.venue.businessId, { courtId: r.av.court.id })}
                      onPickTime={(start) => open(r.venue.businessId, { courtId: r.av.court.id, start })}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] bg-surface p-8 text-center text-fg-2">
                  No hay canchas de ese tipo. Prueba con todas.
                </div>
              )}
            </div>

            {/* El complejo (en la propuesta aquí va el mapa; sin coordenadas mostramos sus datos) */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-20">
              {venues.map((v) => {
                const hours = venueHours(v, date)
                const active = v.courts.filter((c) => c.court.active)
                const minPrice = active.length ? Math.min(...active.map((c) => c.court.pricePerHour)) : null
                return (
                  <aside
                    key={v.businessId}
                    className="overflow-hidden rounded-[24px] border border-line bg-surface"
                  >
                    <div data-zona="verde" className="relative overflow-hidden bg-bg p-5 text-fg">
                      <PortadaLines />
                      <div className="relative">
                        <div className="text-overline text-menta">El complejo</div>
                        <h3 className="mt-2 text-[26px] leading-tight font-extrabold tracking-[-0.025em]">
                          {v.businessName}
                        </h3>
                        <p className="mt-2 flex items-center gap-1.5 text-[15px] text-fg-2">
                          <IconPin className="size-4" />
                          {v.address}
                        </p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 p-5 text-[15px]">
                      <dt className="text-fg-2">Horario {dayPhrase(date, today)}</dt>
                      <dd className="num text-right font-bold text-fg">
                        {hours ? `${formatHour(hours.open)} – ${formatHour(hours.close)}` : 'Cerrado'}
                      </dd>
                      <dt className="text-fg-2">Canchas</dt>
                      <dd className="text-right font-bold text-fg">{active.length}</dd>
                      <dt className="text-fg-2">Desde</dt>
                      <dd className="num text-right font-bold text-fg">
                        {minPrice != null ? `${formatCOP(minPrice)} la hora` : '—'}
                      </dd>
                      <dt className="text-fg-2">Pago</dt>
                      <dd className="text-right font-bold text-fg">Nequi · PSE · Tarjeta</dd>
                    </dl>
                    <div className="grid grid-cols-2 gap-2 px-5 pb-5">
                      <Button className="rounded-full" onClick={() => open(v.businessId)}>
                        Ver horarios
                      </Button>
                      <a
                        href={mapsUrl(`${v.businessName} ${v.address}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClasses('secondary', 'md', 'rounded-full')}
                      >
                        Cómo llegar
                      </a>
                    </div>
                  </aside>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <h2 className="text-display text-[clamp(34px,4.4vw,58px)] leading-none tracking-[-0.035em] text-fg">
          Así de fácil
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {PASOS.map(([title, text], i) => (
            <div key={title} className="rounded-[22px] border border-line bg-surface p-6">
              <i className="mb-4 grid size-11 place-items-center rounded-[12px] bg-botella text-[20px] font-extrabold text-white not-italic">
                {i + 1}
              </i>
              <b className="block text-[22px] font-extrabold tracking-[-0.02em] text-fg">{title}</b>
              <span className="mt-1.5 block leading-relaxed text-fg-2">{text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
