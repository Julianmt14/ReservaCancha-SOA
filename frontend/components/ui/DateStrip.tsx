'use client'

import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { isoDate, parseIsoDate } from '@/lib/format'

interface Props {
  days: string[]
  value: string
  onChange: (iso: string) => void
  /** Días sin horarios libres: se muestran atenuados (siguen siendo elegibles). */
  soldOut?: Set<string>
  className?: string
}

/** Tira horizontal de días: día abreviado en versalitas + número grande. El elegido va en píldora clara. */
export default function DateStrip({ days, value, onChange, soldOut, className }: Props) {
  const today = isoDate(new Date())
  const ref = useRef<HTMLDivElement>(null)

  // Mantiene visible el día elegido cuando llega preseleccionado.
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-selected="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [value])

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label="Elige el día"
      className={clsx(
        'no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 sm:mx-0 sm:scroll-px-0 sm:px-0',
        className
      )}
    >
      {days.map((iso) => {
        const d = parseIsoDate(iso)
        const selected = iso === value
        const isToday = iso === today
        const wd = isToday ? 'Hoy' : d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')
        return (
          <button
            key={iso}
            type="button"
            role="option"
            aria-selected={selected}
            data-selected={selected}
            onClick={() => onChange(iso)}
            className={clsx(
              'relative grid min-w-[62px] shrink-0 snap-start gap-1 rounded-[14px] border px-2 py-2.5 text-center cursor-pointer',
              'transition-[background-color,border-color,color,transform] duration-150 active:scale-[.97]',
              selected ? 'bg-fg border-fg text-bg' : 'border-line text-fg hover:border-line-2',
              !selected && soldOut?.has(iso) && 'opacity-45'
            )}
          >
            <small
              className={clsx(
                'text-[10.5px] font-semibold uppercase tracking-[0.08em]',
                selected ? 'text-bg/70' : isToday ? 'text-accent-text' : 'text-fg-2'
              )}
            >
              {wd}
            </small>
            <b className="num text-[20px] font-semibold leading-none">{d.getDate()}</b>
          </button>
        )
      })}
    </div>
  )
}
