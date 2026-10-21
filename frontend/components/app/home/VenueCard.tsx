'use client'

import type { CourtResponse, SportType } from '@/lib/api/courts'

const SPORT_LABEL: Record<SportType, string> = {
  FUTBOL: 'Fútbol',
  PADEL: 'Pádel',
  VOLEIBOL: 'Voleibol',
}

export interface Venue {
  businessId: number
  businessName: string
  courts: CourtResponse[]
}

interface Props {
  venue: Venue
  onClick: () => void
}

export default function VenueCard({ venue, onClick }: Props) {
  const activeCourts = venue.courts.filter((c) => c.active)
  const sports = [...new Set(venue.courts.map((c) => c.sportType))]

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5 cursor-pointer"
      style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
    >
      <div
        className="h-[6px]"
        style={{ background: 'linear-gradient(90deg, var(--green), var(--green-deep))' }}
      />

      <div className="p-5 flex flex-col gap-3">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
            {venue.businessName}
          </h3>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            Complejo deportivo
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {sports.map((s) => (
            <span
              key={s}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--green-soft)', color: 'var(--green)' }}
            >
              {SPORT_LABEL[s]}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 pt-2 mt-1" style={{ borderTop: '1px solid var(--line)' }}>
          <div>
            <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              Canchas
            </div>
            <div className="text-[14px] font-bold font-mono" style={{ color: 'var(--text)' }}>
              {venue.courts.length}
            </div>
          </div>
          <div>
            <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              Disponibles
            </div>
            <div
              className="text-[14px] font-bold font-mono"
              style={{ color: activeCourts.length > 0 ? 'var(--green)' : 'var(--red)' }}
            >
              {activeCourts.length}
            </div>
          </div>
          <div
            className="ml-auto flex items-center gap-1 text-[12px] font-medium"
            style={{ color: 'var(--text-3)' }}
          >
            Ver canchas
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  )
}
