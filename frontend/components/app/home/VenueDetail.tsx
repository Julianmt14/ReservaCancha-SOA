'use client'

import { useState } from 'react'
import type { Venue } from './VenueCard'
import type { CourtResponse } from '@/lib/api/courts'
import CourtCard from './CourtCard'
import CourtDetail from './CourtDetail'

interface Props {
  venue: Venue
  onBack: () => void
  initialCourtId?: number | null
}

export default function VenueDetail({ venue, onBack, initialCourtId }: Props) {
  const [selectedCourt, setSelectedCourt] = useState<CourtResponse | null>(() =>
    initialCourtId != null ? (venue.courts.find((c) => c.id === initialCourtId) ?? null) : null
  )

  if (selectedCourt) {
    return <CourtDetail court={selectedCourt} onBack={() => setSelectedCourt(null)} />
  }

  return (
    <div className="flex flex-col gap-6 p-7">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] mb-4 cursor-pointer transition-colors"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
        >
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver a complejos
        </button>

        <h1 className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
          {venue.businessName}
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-2)' }}>
          {venue.courts.length} {venue.courts.length === 1 ? 'cancha' : 'canchas'} — selecciona una para ver
          los detalles
        </p>
      </div>

      {venue.courts.length === 0 ? (
        <p className="text-sm text-center py-16" style={{ color: 'var(--text-3)' }}>
          Este complejo no tiene canchas registradas.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venue.courts.map((court) => (
            <CourtCard key={court.id} court={court} onClick={() => setSelectedCourt(court)} />
          ))}
        </div>
      )}
    </div>
  )
}
