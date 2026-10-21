'use client'

import CourtArt from '@/components/app/booking/CourtArt'
import { courtTypeLabel } from '@/components/app/booking/courtType'
import type { CourtAvailability } from '@/components/app/booking/availability'
import { formatCOP, formatHour, initials } from '@/lib/format'

interface Props {
  availability: CourtAvailability
  venueName: string
  /** Horas de inicio libres (1 h) en el día y la franja elegidos. */
  free: number[]
  /** "hoy", "mañana", "el jueves 23". */
  dayLabel: string
  index?: number
  onOpen: () => void
  onPickTime: (start: number) => void
}

/** Tarjeta de cancha (propuesta v3): portada, avatar, precio, tipo y las próximas horas libres. */
export default function CourtCard({
  availability,
  venueName,
  free,
  dayLabel,
  index = 0,
  onOpen,
  onPickTime,
}: Props) {
  const { court } = availability

  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgba(11,74,64,0.45)]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver ${court.name}`}
        className="relative block aspect-[16/10] w-full cursor-pointer"
      >
        <div className="absolute inset-0 overflow-hidden rounded-t-[19px]">
          <CourtArt variant={index} className="h-full w-full" />
        </div>
        {/* Sobre la ilustración siempre oscura: colores fijos */}
        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[13.5px] font-extrabold text-[#10201C]">
          <i
            className={
              court.active && free.length
                ? 'size-2 rounded-full bg-[#1F8A5B]'
                : 'size-2 rounded-full bg-[#C8483B]'
            }
          />
          {!court.active ? 'Fuera de servicio' : free.length ? `${free.length} libres` : 'Sin cupos'}
        </span>
        <span className="absolute -bottom-[22px] left-3 grid size-12 place-items-center rounded-[14px] bg-botella text-[17px] font-extrabold text-white ring-[3px] ring-surface">
          {initials(court.name)}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-2 px-4 pt-7 pb-4">
        <h3 className="text-[21px] leading-tight font-extrabold tracking-[-0.02em] text-fg">
          <button type="button" onClick={onOpen} className="text-left cursor-pointer hover:underline">
            {court.name}
          </button>
        </h3>
        <span className="text-[14.5px] text-fg-2">
          {venueName} · desde <span className="num">{formatCOP(court.pricePerHour)}</span> la hora
        </span>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-[13px] font-bold text-accent-text">
            {courtTypeLabel(court)}
          </span>
        </div>

        <div className="mt-auto border-t border-line pt-2.5">
          <small className="mb-2 block text-[12.5px] font-bold tracking-[0.06em] text-fg-2 uppercase">
            {!court.active
              ? 'Temporalmente fuera de servicio'
              : free.length
                ? `Libre ${dayLabel}`
                : 'Sin horarios libres en esa franja'}
          </small>
          {court.active && free.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {free.slice(0, 4).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onPickTime(h)}
                  title={formatCOP(court.pricePerHour)}
                  className="num rounded-[10px] border-[1.5px] border-accent px-2.5 py-1.5 text-[14px] font-extrabold text-accent-text transition-colors hover:bg-accent hover:text-accent-ink cursor-pointer"
                >
                  {formatHour(h)}
                </button>
              ))}
            </div>
          ) : (
            court.active && <em className="text-[14px] text-fg-2 not-italic">Prueba otro día u otra hora</em>
          )}
        </div>
      </div>
    </article>
  )
}
