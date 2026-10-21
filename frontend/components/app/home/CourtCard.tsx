'use client'

import { TimeChip } from '@/components/ui/Chip'
import CourtArt from '@/components/app/booking/CourtArt'
import { courtTypeLabel } from '@/components/app/booking/courtType'
import {
  dayPart,
  timeOptions,
  type CourtAvailability,
  type DayPart,
} from '@/components/app/booking/availability'
import { formatCOP, formatHour } from '@/lib/format'

interface Props {
  availability: CourtAvailability
  date: string
  part: DayPart | 'all'
  index?: number
  onOpen: () => void
  onPickTime: (start: number) => void
}

/** Fila de cancha: miniatura, tipo, precio por hora y sus próximas horas libres. */
export default function CourtCard({ availability, date, part, index = 0, onOpen, onPickTime }: Props) {
  const { court } = availability
  const free = timeOptions([availability], date, 1).filter(
    (o) => o.free.length > 0 && (part === 'all' || dayPart(o.start) === part)
  )

  return (
    <div className="flex gap-4 rounded-[20px] border border-line bg-surface p-3 shadow-card transition-colors hover:border-line-2">
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 cursor-pointer"
        aria-label={`Ver ${court.name}`}
      >
        <CourtArt variant={index} className="size-[88px] rounded-[14px]" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 py-0.5">
        <button type="button" onClick={onOpen} className="min-w-0 text-left cursor-pointer">
          <div className="truncate text-[15px] font-semibold text-fg">{court.name}</div>
          <div className="mt-0.5 text-[13px] text-fg-2">
            {courtTypeLabel(court)} · <span className="num text-fg">{formatCOP(court.pricePerHour)}</span>/h
          </div>
        </button>
        {!court.active ? (
          <span className="text-[12.5px] text-fg-3">Temporalmente fuera de servicio</span>
        ) : free.length ? (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {free.slice(0, 4).map((o) => (
              <TimeChip
                key={o.start}
                compact
                state="free"
                time={formatHour(o.start)}
                onClick={() => onPickTime(o.start)}
                className="h-8 shrink-0 px-3 [&>span]:text-[13px]"
              />
            ))}
          </div>
        ) : (
          <span className="text-[12.5px] text-fg-3">Sin horas libres en esta franja</span>
        )}
      </div>
    </div>
  )
}
