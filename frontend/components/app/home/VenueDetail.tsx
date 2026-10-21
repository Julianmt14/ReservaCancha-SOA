'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '@/lib/auth/context'
import Segmented from '@/components/ui/Segmented'
import Button, { buttonClasses } from '@/components/ui/Button'
import {
  IconArrowLeft,
  IconCalendar,
  IconCard,
  IconChat,
  IconCheck,
  IconClock,
  IconPin,
  IconShield,
} from '@/components/app/icons'
import CourtArt from '@/components/app/booking/CourtArt'
import CheckoutSheet, { type NewBookingSelection } from '@/components/app/booking/CheckoutSheet'
import { courtTypeLabel } from '@/components/app/booking/courtType'
import { mapsUrl } from '@/components/app/booking/share'
import {
  dayBookings,
  freeCount,
  nextDays,
  openingHours,
  timeOptions,
  type CourtAvailability,
} from '@/components/app/booking/availability'
import type { Venue } from '@/components/app/booking/useVenues'
import { formatCOP, formatDuration, formatHour, hourOf, initials, isoDate, parseIsoDate } from '@/lib/format'

export interface VenueSelection {
  courtId?: number
  start?: number
}

interface Props {
  venue: Venue
  date: string
  onDateChange: (iso: string) => void
  initial?: VenueSelection
  onBack: () => void
  /** Se creó o pagó una reserva: refrescar disponibilidad. */
  onChanged: () => void
}

type Duration = '1' | '1.5' | '2'

const DURATIONS: { value: Duration; label: string }[] = [
  { value: '1', label: '1 h' },
  { value: '1.5', label: '1 h 30' },
  { value: '2', label: '2 h' },
]

/** "Hoy" o "Jue 23" para el resumen. */
function dayLabel(iso: string): string {
  if (iso === isoDate(new Date())) return 'Hoy'
  const d = parseIsoDate(iso)
  const wd = d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getDate()}`
}

function hoursOf(avs: CourtAvailability[], date: string): string {
  const hs = avs
    .map((av) => openingHours(av, date))
    .filter((h): h is { open: number; close: number } => h !== null)
  if (!hs.length) return 'Cerrado'
  return `${formatHour(Math.min(...hs.map((h) => h.open)))} – ${formatHour(Math.max(...hs.map((h) => h.close)))}`
}

/**
 * El nombre nunca se parte a mitad de palabra: si la palabra más larga no cabe, el titular se
 * achica hasta caber (igual que en la propuesta v3).
 */
function useFitTitle(text: string) {
  const ref = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const h = ref.current
    if (!h) return
    const el: HTMLHeadingElement = h
    function fit() {
      el.style.fontSize = ''
      const max = parseFloat(getComputedStyle(el).fontSize)
      const probe = document.createElement('span')
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'
      el.appendChild(probe)
      let widest = 0
      for (const word of text.split(/\s+/)) {
        probe.textContent = word
        widest = Math.max(widest, probe.getBoundingClientRect().width)
      }
      probe.remove()
      if (widest > el.clientWidth)
        el.style.fontSize = `${Math.floor(((max * el.clientWidth) / widest) * 0.97)}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (el.parentElement) ro.observe(el.parentElement)
    document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [text])
  return ref
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <small className="text-[13px] font-bold tracking-[0.14em] text-menta uppercase">{eyebrow}</small>
      <h2 className="mt-2 text-[clamp(34px,4vw,58px)] leading-none font-extrabold tracking-[-0.03em] text-fg">
        {title}
      </h2>
    </div>
  )
}

/**
 * Página del complejo (propuesta v3 «reservar»): portada verde oscuro con el cuadro de reserva.
 * Cancha → día → duración → hora → resumen → CheckoutSheet. Debajo: tarifas y ubicación.
 */
export default function VenueDetail({ venue, date, onDateChange, initial, onBack, onChanged }: Props) {
  const { user } = useAuth()
  const courts = venue.courts.filter((c) => c.court.active)
  const types = [...new Set(courts.map((c) => courtTypeLabel(c.court)))]
  const initialCourt = courts.find((c) => c.court.id === initial?.courtId) ?? courts[0]

  const [courtId, setCourtId] = useState<number | null>(initialCourt?.court.id ?? null)
  const [duration, setDuration] = useState<Duration>('1')
  const [start, setStart] = useState<number | null>(initial?.start ?? null)
  const [checkout, setCheckout] = useState<{ key: number; selection: NewBookingSelection } | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const titleRef = useFitTitle(venue.businessName)

  // Llega desde una hora libre del inicio: en móvil se baja directo al cuadro de reserva.
  useEffect(() => {
    if (initial?.start == null || window.innerWidth >= 1024) return
    const t = setTimeout(
      () => document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' }),
      350
    )
    return () => clearTimeout(t)
  }, [initial?.start])

  const court = courts.find((c) => c.court.id === courtId) ?? courts[0] ?? null
  const hours = Number(duration)
  const days = nextDays(7)
  const options = court ? timeOptions([court], date, hours) : []
  const soldOut = new Set(days.filter((d) => court && freeCount([court], d) === 0))
  const closed = court ? openingHours(court, date) === null : true

  // Selección derivada: si cambia la cancha, el día o la duración y la hora ya no está libre, se descarta.
  const option = options.find((o) => o.start === start && o.free.length > 0) ?? null
  const total = option && court ? court.court.pricePerHour * hours : null

  // Horas en las que el jugador ya tiene reserva en esta cancha
  const mine = new Set<number>()
  if (user && court) {
    for (const b of dayBookings(court, date))
      if (b.playerId === user.userId) for (let h = hourOf(b.startAt); h < hourOf(b.endAt); h += 1) mine.add(h)
  }

  const minPrice = courts.length ? Math.min(...courts.map((c) => c.court.pricePerHour)) : null
  const where = mapsUrl(`${venue.businessName} ${venue.address}`)

  function openCheckout() {
    if (!option || !court) return
    const selection = { court: court.court, date, start: option.start, end: option.end }
    setCheckout((c) => ({ key: (c?.key ?? 0) + 1, selection }))
    setCheckoutOpen(true)
  }

  const chip =
    'inline-flex items-center gap-1.5 rounded-full border border-line bg-bg/60 px-3 py-2 text-[14.5px] font-medium backdrop-blur-md'

  return (
    <div data-theme="dark" className="relative flex-1 bg-bg pb-16 text-fg">
      {/* Portada con el cuadro de reserva */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <CourtArt className="h-full w-full" />
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,31,27,0.92)_0%,rgba(6,31,27,0.55)_55%,rgba(6,31,27,0.82)_100%),linear-gradient(180deg,rgba(6,31,27,0.4),transparent_30%,rgba(6,31,27,0.95))]" />

        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 px-4 pt-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-12 lg:px-8 lg:pt-6 lg:pb-16">
          <div className="flex items-center gap-3 lg:col-span-2">
            <button
              onClick={onBack}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-black/35 px-4 text-[14px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/55 cursor-pointer"
            >
              <IconArrowLeft className="size-[17px]" />
              Canchas
            </button>
            <span className="hidden text-[14.5px] text-fg-2 sm:inline">
              Villavicencio › <b className="font-bold text-white">{venue.businessName}</b>
            </span>
          </div>

          {/* Quién y titular */}
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-[54px] shrink-0 place-items-center rounded-[14px] bg-botella text-[20px] font-extrabold text-white ring-2 ring-white/85">
                {initials(venue.businessName)}
              </span>
              <div className="min-w-0">
                <b className="text-[16px] font-bold">{venue.businessName}</b>
                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 align-middle text-[12.5px] font-bold text-menta">
                  <IconCheck className="size-3" />
                  Reserva en línea
                </span>
                <small className="block text-[14px] text-fg-2">{venue.address}</small>
              </div>
            </div>
            <h1
              ref={titleRef}
              className="text-[15vw] leading-[0.88] font-extrabold tracking-[-0.03em] uppercase sm:text-[80px] lg:text-[clamp(54px,7.6vw,124px)]"
            >
              {venue.businessName}
              <em className="mt-[0.3em] block text-[0.42em] font-medium tracking-[-0.02em] text-[#DDEBE6] not-italic normal-case">
                Reserva y juega.
              </em>
            </h1>
            <p className="mt-4 max-w-[540px] text-[17px] leading-relaxed text-fg-2 sm:text-[18px]">
              {courts.length} {courts.length === 1 ? 'cancha' : 'canchas'}
              {types.length ? ` (${types.join(', ')})` : ''} en {venue.address}. Elige cancha, día y hora;
              pagas en línea y el horario queda a tu nombre.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {types.map((t) => (
                <span key={t} className={chip}>
                  {t}
                </span>
              ))}
              {minPrice != null && (
                <span className={chip}>
                  desde <b className="num font-bold">{formatCOP(minPrice)}</b> la hora
                </span>
              )}
              <span className={chip}>
                <IconClock className="size-4" />
                <span className="num">{hoursOf(courts, date)}</span>
              </span>
              <a
                href={where}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(chip, 'hover:bg-bg/80')}
              >
                <IconPin className="size-4" />
                Cómo llegar
              </a>
            </div>
          </div>

          {/* Cuadro de reserva */}
          <section
            id="reservar"
            aria-label="Reserva en línea"
            className="scroll-mt-20 rounded-[24px] border border-line bg-surface/95 p-4 shadow-pop backdrop-blur-md sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5 text-[13px] font-bold tracking-[0.08em] text-fg-2 uppercase">
              <span className="inline-flex items-center gap-2">
                <IconCalendar className="size-[18px]" />
                Reserva en línea
              </span>
              <span className="inline-flex items-center gap-2 font-medium tracking-normal normal-case">
                <i className="size-2 rounded-full bg-menta shadow-[0_0_0_4px_rgba(111,211,168,0.18)]" />
                Disponibilidad en tiempo real
              </span>
            </div>
            <h2 className="mt-2.5 mb-3.5 text-[24px] leading-[1.1] font-extrabold tracking-[-0.025em] sm:text-[26px]">
              Aparta tu cancha en 30 segundos
            </h2>

            {courts.length === 0 ? (
              <p className="rounded-[16px] border border-dashed border-line-2 px-4 py-8 text-center text-fg-2">
                Ninguna cancha está recibiendo reservas en este momento.
              </p>
            ) : (
              <>
                {/* Cancha */}
                <div className="flex flex-wrap gap-2" role="group" aria-label="Cancha">
                  {courts.map((av) => {
                    const on = av.court.id === court?.court.id
                    return (
                      <button
                        key={av.court.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setCourtId(av.court.id)}
                        className={clsx(
                          'rounded-full border px-3.5 py-2 text-left text-[14.5px] font-bold transition-colors cursor-pointer',
                          on ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:border-line-2'
                        )}
                      >
                        {av.court.name}
                        <small className={clsx('ml-1 font-medium', on ? 'opacity-70' : 'text-fg-2')}>
                          {formatCOP(av.court.pricePerHour)}/h
                        </small>
                      </button>
                    )
                  })}
                </div>

                {/* Día */}
                <div className="my-3.5 grid grid-cols-7 gap-1 sm:gap-1.5" role="group" aria-label="Día">
                  {days.map((d) => {
                    const on = d === date
                    const dd = parseIsoDate(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onDateChange(d)}
                        className={clsx(
                          'rounded-[14px] border py-2 text-center transition-colors cursor-pointer',
                          on ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:border-line-2',
                          !on && soldOut.has(d) && 'opacity-45'
                        )}
                      >
                        <small
                          className={clsx(
                            'block text-[10px] font-bold tracking-[0.06em] uppercase sm:text-[11.5px]',
                            on ? 'text-accent-ink' : 'text-fg-2'
                          )}
                        >
                          {d === days[0]
                            ? 'Hoy'
                            : dd.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')}
                        </small>
                        <b className="num text-[18px] font-extrabold sm:text-[21px]">{dd.getDate()}</b>
                      </button>
                    )
                  })}
                </div>

                {/* Duración */}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[14px] font-medium text-fg-2">Duración del partido</span>
                  <Segmented
                    size="sm"
                    value={duration}
                    onChange={setDuration}
                    options={DURATIONS}
                    aria-label="Duración del partido"
                  />
                </div>

                {/* Horas */}
                <div
                  className="grid max-h-[300px] grid-cols-3 gap-1.5 overflow-auto pr-0.5 sm:grid-cols-4"
                  role="group"
                  aria-label="Horario"
                >
                  {options.length === 0 ? (
                    <p className="col-span-full px-0.5 py-2.5 text-fg-2">
                      {closed
                        ? 'Esta cancha no abre ese día. Mira otro día.'
                        : 'Por hoy ya no quedan horarios. Mira mañana.'}
                    </p>
                  ) : (
                    options.map((o) => {
                      const free = o.free.length > 0
                      const on = option?.start === o.start
                      return (
                        <button
                          key={o.start}
                          type="button"
                          disabled={!free}
                          aria-pressed={on}
                          onClick={() => setStart(o.start)}
                          className={clsx(
                            'group rounded-[12px] border px-2.5 py-2 text-left transition-colors',
                            on
                              ? 'border-accent bg-accent text-accent-ink'
                              : 'border-line enabled:hover:border-white/50',
                            free ? 'cursor-pointer' : 'cursor-default opacity-[0.38]'
                          )}
                        >
                          <b
                            className={clsx('num block text-[16px] font-extrabold', !free && 'line-through')}
                          >
                            {formatHour(o.start)}
                          </b>
                          <span className={clsx('num text-[13px]', on ? 'text-accent-ink' : 'text-fg-2')}>
                            {free ? formatCOP(o.minPrice ?? 0) : mine.has(o.start) ? 'Tu reserva' : 'Ocupado'}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Resumen */}
                <div className="mt-3.5 flex min-h-16 flex-col items-stretch justify-between gap-3 rounded-[16px] bg-surface-2 py-3 pr-3 pl-4 sm:flex-row sm:items-center">
                  <p className="text-[15px] leading-snug text-fg-2">
                    {option && court ? (
                      <>
                        <b className="num block text-[16.5px] font-bold text-fg">
                          {dayLabel(date)} · {formatHour(option.start)}–{formatHour(option.end)}
                        </b>
                        {court.court.name} · {formatDuration(hours)} ·{' '}
                        <span className="num">{total != null ? formatCOP(total) : ''}</span>
                      </>
                    ) : (
                      'Elige un horario disponible'
                    )}
                  </p>
                  <Button
                    size="lg"
                    disabled={!option}
                    onClick={openCheckout}
                    className="shrink-0 rounded-full font-extrabold disabled:opacity-35"
                  >
                    Reservar
                  </Button>
                </div>
              </>
            )}

            <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-2 text-[13px] text-fg-2">
              <span className="inline-flex items-center gap-1.5">
                <IconCard className="size-[15px]" /> Nequi · PSE · Tarjeta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconShield className="size-[15px]" /> Sin cruces de horario
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconChat className="size-[15px]" /> Comparte por WhatsApp
              </span>
            </div>
          </section>
        </div>
      </section>

      {/* Tarifas */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <SectionHead eyebrow="Tarifas" title="Precios claros, sin sorpresas" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {venue.courts.map((av, i) => (
            <div key={av.court.id} className="overflow-hidden rounded-[20px] border border-line bg-surface">
              <div className="relative h-28">
                <CourtArt variant={i} className="h-full w-full" />
              </div>
              <div className="p-5 sm:p-6">
                <small className="font-medium text-fg-2">
                  {courtTypeLabel(av.court)}
                  {!av.court.active && ' · fuera de servicio'}
                </small>
                <h3 className="mt-0.5 mb-3.5 text-[22px] font-extrabold tracking-[-0.02em]">
                  {av.court.name}
                </h3>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
                  {[1, 1.5, 2].map((h) => (
                    <div key={h} className="contents">
                      <dt className="text-fg-2">{h === 1 ? '1 hora' : formatDuration(h)}</dt>
                      <dd className="num text-[19px] font-extrabold">
                        {formatCOP(av.court.pricePerHour * h)}
                      </dd>
                    </div>
                  ))}
                  <dt className="text-fg-2">Horario {dayLabel(date).toLowerCase()}</dt>
                  <dd className="num font-bold">{hoursOf([av], date)}</dd>
                </dl>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ubicación */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <SectionHead eyebrow="Ubicación" title="Cómo llegar" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="relative min-h-[260px] overflow-hidden rounded-[20px] border border-line bg-[#0B2A25]">
            <svg
              viewBox="0 0 600 300"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden
              className="absolute inset-0 h-full w-full"
            >
              <rect width="600" height="300" fill="#0B2A25" />
              <g stroke="#123A33" strokeWidth="18" fill="none" strokeLinecap="round">
                <path d="M-20 210C120 190 220 120 330 140S520 230 640 200" />
                <path d="M90 -20 140 320" />
                <path d="M420 -20 380 320" />
              </g>
              <g stroke="#174A41" strokeWidth="7" fill="none">
                <path d="M-20 90H640M-20 260H640M250 -20V320M520 -20V320" />
              </g>
              <g fill="#0E332D">
                <rect x="160" y="30" width="70" height="44" rx="6" />
                <rect x="270" y="170" width="90" height="60" rx="6" />
                <rect x="450" y="40" width="60" height="40" rx="6" />
                <rect x="30" y="120" width="44" height="60" rx="6" />
              </g>
            </svg>
            <div className="absolute top-[46%] left-1/2 grid -translate-x-1/2 -translate-y-full justify-items-center">
              <span className="rounded-[12px] bg-white px-3 py-2 font-extrabold whitespace-nowrap text-botella shadow-[0_10px_20px_-8px_rgba(0,0,0,0.6)]">
                {venue.businessName}
              </span>
              <i className="-mt-2 size-3.5 rotate-45 bg-white" />
            </div>
            <span className="absolute bottom-3 left-3 rounded-[10px] bg-bg/80 px-2.5 py-1.5 text-[12.5px] font-bold text-fg-2">
              Mapa ilustrado · la ubicación exacta está en Google Maps
            </span>
          </div>

          <div className="grid content-start gap-3.5 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
            {[
              { icon: <IconPin className="size-[18px]" />, label: 'Dirección', value: venue.address },
              {
                icon: <IconClock className="size-[18px]" />,
                label: `Horario · ${dayLabel(date).toLowerCase()}`,
                value: hoursOf(courts, date),
              },
              {
                icon: <IconCard className="size-[18px]" />,
                label: 'Pago',
                value: 'En línea con Wompi: Nequi, PSE o tarjeta',
              },
            ].map((d) => (
              <div key={d.label} className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-3">
                <i className="grid size-9 place-items-center rounded-[10px] bg-surface-2 not-italic">
                  {d.icon}
                </i>
                <span>
                  <small className="block text-[13px] text-fg-2">{d.label}</small>
                  <b className="font-bold">{d.value}</b>
                </span>
              </div>
            ))}
            <div className="mt-1 flex flex-wrap gap-2">
              <a
                href={where}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses('primary', 'md', 'rounded-full font-extrabold')}
              >
                Abrir en Google Maps
              </a>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-11 items-center rounded-full px-4 text-[14px] font-extrabold shadow-[inset_0_0_0_1px_rgba(234,243,240,0.35)] transition-colors hover:bg-white/5 lg:h-10 cursor-pointer"
              >
                Ver todas las canchas
              </button>
            </div>
          </div>
        </div>
      </section>

      {checkout && (
        <CheckoutSheet
          key={checkout.key}
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          venueName={venue.businessName}
          address={venue.address}
          selection={checkout.selection}
          onBooked={() => {
            setStart(null)
            onChanged()
          }}
          onPaid={onChanged}
          onConflict={onChanged}
        />
      )}
    </div>
  )
}
