'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '@/lib/auth/context'
import DateStrip from '@/components/ui/DateStrip'
import Chip, { TimeChip } from '@/components/ui/Chip'
import Segmented from '@/components/ui/Segmented'
import Button, { buttonClasses } from '@/components/ui/Button'
import {
  IconArrowLeft,
  IconCalendar,
  IconCard,
  IconChat,
  IconPin,
  IconShield,
  IconCanchas,
  IconCheck,
} from '@/components/app/icons'
import CourtArt from '@/components/app/booking/CourtArt'
import CheckoutSheet, { type NewBookingSelection } from '@/components/app/booking/CheckoutSheet'
import { courtTypeLabel } from '@/components/app/booking/courtType'
import { mapsUrl } from '@/components/app/booking/share'
import {
  DAY_PART_LABEL,
  dayBookings,
  dayPart,
  freeCount,
  nextDays,
  timeOptions,
  type DayPart,
} from '@/components/app/booking/availability'
import type { Venue } from '@/components/app/booking/useVenues'
import { formatCOP, formatDayShort, formatDuration, formatHour, hourOf } from '@/lib/format'

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

/**
 * Pantalla del complejo: hora primero, cancha después (patrón Playtomic).
 * Día → duración → hora → cancha → barra con precio → CheckoutSheet.
 */
export default function VenueDetail({ venue, date, onDateChange, initial, onBack, onChanged }: Props) {
  const { user } = useAuth()
  const courts = venue.courts.filter((c) => c.court.active)
  const types = [...new Set(courts.map((c) => courtTypeLabel(c.court)))]
  const initialCourt = courts.find((c) => c.court.id === initial?.courtId)

  const [type, setType] = useState<string>(initialCourt ? courtTypeLabel(initialCourt.court) : 'all')
  const [duration, setDuration] = useState<Duration>('1')
  const [start, setStart] = useState<number | null>(initial?.start ?? null)
  const [courtId, setCourtId] = useState<number | null>(initial?.courtId ?? null)
  const [checkout, setCheckout] = useState<{ key: number; selection: NewBookingSelection } | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const hours = Number(duration)
  const pool = type === 'all' ? courts : courts.filter((c) => courtTypeLabel(c.court) === type)
  const options = timeOptions(pool, date, hours)
  const days = nextDays()
  const soldOut = new Set(days.filter((d) => pool.length > 0 && freeCount(pool, d) === 0))

  // Selección derivada: si el día/duración cambia y la hora ya no está libre, se descarta sola.
  const option = options.find((o) => o.start === start && o.free.length > 0) ?? null
  const chosen = option ? (option.free.find((c) => c.court.id === courtId) ?? option.free[0]) : null
  const total = chosen ? chosen.court.pricePerHour * hours : null

  // Horas en las que el jugador ya tiene reserva
  const mine = new Set<number>()
  if (user) {
    for (const av of pool)
      for (const b of dayBookings(av, date))
        if (b.playerId === user.userId)
          for (let h = hourOf(b.startAt); h < hourOf(b.endAt); h += 1) mine.add(h)
  }

  const groups = (['manana', 'tarde', 'noche'] as DayPart[])
    .map((p) => ({ part: p, items: options.filter((o) => dayPart(o.start) === p) }))
    .filter((g) => g.items.length > 0)

  const minPrice = courts.length ? Math.min(...courts.map((c) => c.court.pricePerHour)) : null

  function openCheckout() {
    if (!option || !chosen) return
    const selection = { court: chosen.court, date, start: option.start, end: option.end }
    setCheckout((c) => ({ key: (c?.key ?? 0) + 1, selection }))
    setCheckoutOpen(true)
  }

  const summaryText = option && chosen && (
    <>
      <b className="block truncate text-[14.5px] font-semibold text-fg">{chosen.court.name}</b>
      <span className="block truncate text-[12.5px] text-fg-2 first-letter:uppercase">
        {formatDayShort(date)} · {formatHour(option.start)}–{formatHour(option.end)} · {formatDuration(hours)}
      </span>
    </>
  )

  return (
    <div className="relative pb-32 lg:pb-16">
      {/* Hero */}
      <div className="absolute inset-x-0 top-0 h-[400px] sm:h-[480px] lg:h-[680px]">
        <CourtArt className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="pt-4 lg:pt-6">
          <button
            onClick={onBack}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-black/40 px-4 text-[13.5px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/60 cursor-pointer"
          >
            <IconArrowLeft className="size-[17px]" />
            Complejos
          </button>
        </div>

        <div className="grid grid-cols-1 items-end gap-6 pt-14 sm:pt-40 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:pt-32">
          {/* Título */}
          <div className="text-white lg:pt-28">
            <div className="text-overline text-white/70">Complejo deportivo · Villavicencio</div>
            <h1 className="text-display mt-3 text-[42px] sm:text-[72px] lg:text-[clamp(56px,6vw,96px)]">
              {venue.businessName}
              <br />
              <span className="text-accent">Reserva</span> y juega.
            </h1>
            <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0 lg:mt-5">
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[13px] whitespace-nowrap backdrop-blur-md">
                <IconCanchas />
                {courts.length} {courts.length === 1 ? 'cancha' : 'canchas'}
              </span>
              {minPrice != null && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[13px] whitespace-nowrap backdrop-blur-md">
                  desde <b className="num font-semibold">{formatCOP(minPrice)}</b>/h
                </span>
              )}
              <a
                href={mapsUrl(`${venue.businessName} ${venue.address}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[13px] whitespace-nowrap backdrop-blur-md transition-colors hover:bg-white/20"
              >
                <IconPin className="size-[15px]" />
                {venue.address}
              </a>
            </div>
          </div>

          {/* Tarjeta de reserva */}
          <section
            id="reservar"
            className="rounded-[24px] border border-line bg-surface p-4 shadow-pop sm:p-6 lg:p-7"
            aria-label="Reserva en línea"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <span className="text-overline inline-flex items-center gap-2 text-fg-2">
                  <IconCalendar className="size-4 text-accent-text" />
                  Reserva en línea
                </span>
                <h2 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
                  Aparta tu cancha en 30 segundos
                </h2>
              </div>
              <span className="mt-0.5 hidden items-center gap-2 text-[12px] whitespace-nowrap text-fg-2 sm:flex">
                <i className="size-2 rounded-full bg-success ring-4 ring-success/20" />
                Disponibilidad en tiempo real
              </span>
            </div>

            {types.length > 1 && (
              <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <Chip selected={type === 'all'} onClick={() => setType('all')}>
                  Todas
                </Chip>
                {types.map((t) => (
                  <Chip key={t} selected={type === t} onClick={() => setType(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            )}

            <DateStrip days={days} value={date} onChange={onDateChange} soldOut={soldOut} className="mb-4" />

            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-[13.5px] font-medium text-fg-2">Duración</span>
              <Segmented
                size="sm"
                value={duration}
                onChange={setDuration}
                options={DURATIONS}
                aria-label="Duración del partido"
              />
            </div>

            {/* Horas */}
            {groups.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-line-2 px-4 py-8 text-center text-[14px] text-fg-2">
                No hay horarios para este día. Prueba con otra fecha.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((g) => (
                  <div key={g.part}>
                    <div className="text-overline mb-2 text-fg-3">{DAY_PART_LABEL[g.part]}</div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {g.items.map((o) => {
                        const isMine = o.free.length === 0 && mine.has(o.start)
                        return (
                          <TimeChip
                            key={o.start}
                            time={formatHour(o.start)}
                            state={
                              o.free.length === 0 ? 'busy' : option?.start === o.start ? 'selected' : 'free'
                            }
                            caption={
                              isMine ? 'Tu reserva' : o.minPrice != null ? formatCOP(o.minPrice) : 'Ocupado'
                            }
                            onClick={() => {
                              setStart(o.start)
                              if (!o.free.some((c) => c.court.id === courtId))
                                setCourtId(o.free[0]?.court.id ?? null)
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cancha a esa hora */}
            {option && courts.length > 1 && (
              <div className="mt-5">
                <div className="text-overline mb-2 text-fg-3">
                  Canchas libres a las <span className="num">{formatHour(option.start)}</span>
                </div>
                <div className="grid gap-2">
                  {option.free.map((av) => {
                    const selected = chosen?.court.id === av.court.id
                    return (
                      <button
                        key={av.court.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setCourtId(av.court.id)}
                        className={clsx(
                          'flex items-center gap-3 rounded-[14px] border p-3 text-left transition-colors cursor-pointer',
                          selected ? 'border-accent bg-accent-soft' : 'border-line-2 hover:border-fg-3'
                        )}
                      >
                        <span
                          className={clsx(
                            'grid size-5 shrink-0 place-items-center rounded-full border',
                            selected ? 'border-accent bg-accent text-accent-ink' : 'border-line-2'
                          )}
                        >
                          {selected && <IconCheck className="size-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-fg">
                            {av.court.name}
                          </span>
                          <span className="block text-[12.5px] text-fg-2">{courtTypeLabel(av.court)}</span>
                        </span>
                        <span className="num text-[14px] font-semibold text-fg">
                          {formatCOP(av.court.pricePerHour * hours)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Resumen (escritorio y tableta) */}
            <div className="mt-5 hidden min-h-16 items-center justify-between gap-4 rounded-[16px] bg-surface-2 p-3.5 sm:flex">
              {option && chosen ? (
                <>
                  <div className="min-w-0">{summaryText}</div>
                  <Button size="lg" onClick={openCheckout} className="shrink-0">
                    Reservar y pagar <span className="num">{total != null ? formatCOP(total) : ''}</span>
                  </Button>
                </>
              ) : (
                <span className="px-1 text-[14px] text-fg-2">Elige un horario disponible</span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-fg-2">
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

        {/* Info del complejo */}
        <section className="mt-10 lg:mt-14">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-display text-[30px] text-fg sm:text-[40px]">Las canchas</h2>
            <a
              href={mapsUrl(`${venue.businessName} ${venue.address}`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses('secondary', 'sm', 'rounded-full')}
            >
              <IconPin className="size-4" />
              Cómo llegar
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {venue.courts.map((av, i) => (
              <div key={av.court.id} className="overflow-hidden rounded-[20px] border border-line bg-surface">
                <CourtArt variant={i} className="h-32 w-full" />
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-fg">{av.court.name}</div>
                    <div className="mt-0.5 text-[13px] text-fg-2">
                      {courtTypeLabel(av.court)}
                      {!av.court.active && ' · fuera de servicio'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-[16px] font-semibold text-fg">
                      {formatCOP(av.court.pricePerHour)}
                    </div>
                    <div className="text-[11.5px] text-fg-3">por hora</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Barra fija con precio (móvil) */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl sm:hidden">
        {option && chosen ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">{summaryText}</div>
            <Button onClick={openCheckout} className="h-12 shrink-0 rounded-[14px] px-4">
              Reservar <span className="num">{total != null ? formatCOP(total) : ''}</span>
            </Button>
          </div>
        ) : (
          <div className="flex h-12 items-center text-[14px] text-fg-2">Elige un horario disponible</div>
        )}
      </div>

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
