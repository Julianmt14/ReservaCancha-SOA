'use client'

import type { ReactNode } from 'react'

export const HOUR_PX = 56
export const LABEL_COL_W = 56

export const DAY_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const
export type DayOfWeek = (typeof DAY_ORDER)[number]

export const DAY_LABEL_SHORT: Record<DayOfWeek, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY: 'Jue',
  FRIDAY: 'Vie',
  SATURDAY: 'Sáb',
  SUNDAY: 'Dom',
}

export function parseHour(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h + m / 60
}

export function fmtHour(h: number): string {
  return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`
}

export function toPercent(startHour: number, endHour: number, hourStart: number, hourEnd: number) {
  const total = hourEnd - hourStart
  const top = ((startHour - hourStart) / total) * 100
  const height = ((endHour - startHour) / total) * 100
  return { top, height }
}

// ─────────────────────────────────────────────────────────────────────────────

export interface CalendarColumn {
  key: string
  headerContent: ReactNode // full header cell content
  headerColor?: string
  cellBg?: (hour: number) => string | undefined
}

export interface CalendarOverlay {
  /** index matching columns array position */
  colIndex: number
  children: ReactNode
}

interface Props {
  hourStart: number
  hourEnd: number
  columns: CalendarColumn[]
  overlays?: CalendarOverlay[]
  maxHeight?: number
  onMouseUp?: () => void
  onMouseLeave?: () => void
}

export default function WeekCalendarGrid({
  hourStart,
  hourEnd,
  columns,
  overlays = [],
  maxHeight = 560,
  onMouseUp,
  onMouseLeave,
}: Props) {
  const colCount = columns.length
  const hours = Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i)
  const TOTAL_H = HOUR_PX * hours.length
  const colW = 100 / colCount
  const minW = LABEL_COL_W + colCount * 100

  return (
    <div
      className="overflow-auto select-none"
      style={{ maxHeight }}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${LABEL_COL_W}px repeat(${colCount}, 1fr)`,
          minWidth: minW,
        }}
      >
        <div
          style={{
            background: 'var(--bg-2)',
            borderRight: '1px solid var(--line)',
            borderBottom: '1px solid var(--line)',
          }}
        />
        {columns.map((col) => (
          <div
            key={col.key}
            className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em]"
            style={{
              background: 'var(--bg-2)',
              borderRight: '1px solid var(--line)',
              borderBottom: '1px solid var(--line)',
              color: col.headerColor ?? 'var(--text-3)',
            }}
          >
            {col.headerContent}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', minWidth: minW }}>
        {/* Hour labels */}
        <div style={{ width: LABEL_COL_W, flexShrink: 0 }}>
          {hours.map((hour) => (
            <div
              key={hour}
              className="text-right pr-2 font-mono text-[10px]"
              style={{
                height: HOUR_PX,
                paddingTop: 6,
                boxSizing: 'border-box',
                background: 'var(--bg-2)',
                borderRight: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
                color: 'var(--text-3)',
              }}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Cell area + overlays */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, height: TOTAL_H }}>
            {hours.map((hour) =>
              columns.map((col) => (
                <div
                  key={`${hour}-${col.key}`}
                  style={{
                    height: HOUR_PX,
                    borderRight: '1px solid var(--line)',
                    borderBottom: '1px solid var(--line)',
                    background: col.cellBg?.(hour) ?? 'transparent',
                  }}
                />
              ))
            )}
          </div>

          {/* Overlays — truly absolute over the cell area */}
          {overlays.map((ov, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                left: `${ov.colIndex * colW}%`,
                width: `${colW}%`,
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {ov.children}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
