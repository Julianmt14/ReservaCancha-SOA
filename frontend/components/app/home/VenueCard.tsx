'use client'

import clsx from 'clsx'
import { TimeChip } from '@/components/ui/Chip'
import { IconArrowRight, IconPin } from '@/components/app/icons'
import CourtArt from '@/components/app/booking/CourtArt'
import { courtTypeLabel } from '@/components/app/booking/courtType'
import { dayPart, freeCount, timeOptions, type DayPart } from '@/components/app/booking/availability'
import type { Venue } from '@/components/app/booking/useVenues'
import { formatCOP, formatHour, relativeDayLabel } from '@/lib/format'

export type { Venue }

interface Props {
  venue: Venue
  date: string
  part: DayPart | 'all'
  onOpen: () => void
  onPickTime: (start: number) => void
  className?: string
}

/** Tarjeta media-first del complejo con las próximas horas libres del día elegido. */
export default function VenueCard({ venue, date, part, onOpen, onPickTime, className }: Props) {
  const active = venue.courts.filter((c) => c.court.active)
  const options = timeOptions(active, date, 1).filter(
    (o) => o.free.length > 0 && (part === 'all' || dayPart(o.start) === part)
  )
  const free = freeCount(active, date)
  const minPrice = active.length ? Math.min(...active.map((c) => c.court.pricePerHour)) : null
  const types = [...new Set(active.map((c) => courtTypeLabel(c.court)))]

  return (
    <article
      className={clsx('overflow-hidden rounded-[24px] border border-line bg-surface shadow-card', className)}
    >
      <button type="button" onClick={onOpen} className="group relative block w-full text-left cursor-pointer">
        <CourtArt className="h-52 w-full transition-transform duration-500 group-hover:scale-[1.02] sm:h-64" />
        <div className="absolute top-4 left-4 flex gap-2">
          {/* Sobre la foto siempre oscura: colores fijos, no del tema */}
          <span
            className={clsx(
              'inline-flex h-6 items-center rounded-full border bg-black/55 px-2.5 text-[10.5px] font-bold tracking-[0.1em] uppercase backdrop-blur',
              free === 0
                ? 'border-[#F04D4D]/50 text-[#FF8A8A]'
                : free <= 3
                  ? 'border-[#F5B942]/50 text-[#F5B942]'
                  : 'border-[#C6FF3D]/45 text-[#C6FF3D]'
            )}
          >
            {free === 0 ? 'Sin cupos' : free <= 3 ? 'Últimos cupos' : 'Disponible'}
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-5">
          <h2 className="text-display text-[34px] text-white sm:text-[44px]">{venue.businessName}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-[13.5px] text-white/75">
            <IconPin className="size-[15px]" />
            {venue.address}
          </p>
        </div>
      </button>

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {types.map((t) => (
            <span
              key={t}
              className="rounded-full border border-line-2 px-3 py-1 text-[12.5px] font-medium text-fg-2"
            >
              {t}
            </span>
          ))}
          <span className="ml-auto text-[13px] text-fg-2">
            desde{' '}
            <b className="num text-[15px] font-semibold text-fg">
              {minPrice != null ? formatCOP(minPrice) : '—'}
            </b>
            /h
          </span>
        </div>

        <div>
          <div className="text-overline mb-2.5 flex items-center justify-between text-fg-2">
            <span>Horas libres · {relativeDayLabel(date)}</span>
            <span className="num normal-case tracking-normal text-fg-3">{free} disponibles</span>
          </div>
          {options.length ? (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {options.slice(0, 6).map((o) => (
                <TimeChip
                  key={o.start}
                  compact
                  state="free"
                  time={formatHour(o.start)}
                  onClick={() => onPickTime(o.start)}
                  className="shrink-0"
                />
              ))}
            </div>
          ) : (
            <p className="text-[13.5px] text-fg-3">No quedan horas libres en esta franja. Prueba otro día.</p>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="flex items-center justify-between rounded-[14px] border border-line px-4 py-3 text-[14px] font-semibold text-fg transition-colors hover:border-line-2 hover:bg-surface-2 cursor-pointer"
        >
          Ver todos los horarios
          <IconArrowRight className="size-[18px] text-accent-text" />
        </button>
      </div>
    </article>
  )
}
