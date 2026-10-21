'use client'

import type { CourtResponse } from '@/lib/api/courts'

const SPORT_LABEL: Record<string, string> = {
  FUTBOL: 'Fútbol',
  PADEL: 'Pádel',
  VOLEIBOL: 'Voleibol',
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-CO') + '/h'
}

interface Props {
  court: CourtResponse
  onClick?: () => void
  onReserve?: () => void
}

export default function CourtCard({ court, onClick, onReserve }: Props) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        className="h-[6px] w-full"
        style={{ background: 'linear-gradient(90deg, var(--green), var(--green-deep))' }}
      />

      <div className="flex flex-col gap-3 p-5">
        {/* Name + sport + price */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--text)' }}>
              {court.name}
            </h3>
            <span
              className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--green-soft)', color: 'var(--green)' }}
            >
              {SPORT_LABEL[court.sportType] ?? court.sportType}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[14px] font-bold font-mono" style={{ color: 'var(--green)' }}>
              {fmt(court.pricePerHour)}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {court.address}
        </div>

        {/* Description */}
        {court.description && (
          <p className="text-[12.5px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-2)' }}>
            {court.description}
          </p>
        )}

        {/* Status */}
        <div className="flex items-center gap-1.5 pt-1 mt-auto">
          <span
            className="size-2 rounded-full"
            style={{ background: court.active ? 'var(--green)' : 'var(--red)' }}
          />
          <span className="text-[11.5px]" style={{ color: 'var(--text-3)' }}>
            {court.active ? 'Disponible' : 'No disponible'}
          </span>
        </div>

        {onReserve && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onReserve()
            }}
            disabled={!court.active}
            className="w-full rounded-lg py-2 text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
        )}
      </div>
    </div>
  )
}
