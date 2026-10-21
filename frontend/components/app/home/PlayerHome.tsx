'use client'

import { useEffect, useState } from 'react'
import { getCourts, type CourtResponse } from '@/lib/api/courts'
import { useAuth } from '@/lib/auth/context'
import VenueCard, { type Venue } from './VenueCard'
import VenueDetail from './VenueDetail'

function groupByBusiness(courts: CourtResponse[]): Venue[] {
  const map = new Map<number, Venue>()
  for (const court of courts) {
    if (!map.has(court.businessId)) {
      map.set(court.businessId, {
        businessId: court.businessId,
        businessName: court.businessName,
        courts: [],
      })
    }
    map.get(court.businessId)!.courts.push(court)
  }
  return [...map.values()]
}

export default function PlayerHome() {
  const { user } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<Venue | null>(null)
  const [initialCourtId, setInitialCourtId] = useState<number | null>(null)

  const firstName = user?.fullName?.split(' ')[0] ?? ''
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    const stored = sessionStorage.getItem('openCourtId')
    if (stored) {
      setInitialCourtId(Number(stored))
      sessionStorage.removeItem('openCourtId')
    }
    getCourts(0, 100)
      .then((page) => {
        const vs = groupByBusiness(page.content)
        setVenues(vs)
        if (stored) {
          const courtId = Number(stored)
          const venue = vs.find((v: Venue) => v.courts.some((c: CourtResponse) => c.id === courtId))
          if (venue) setSelected(venue)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (selected) {
    return (
      <VenueDetail
        venue={selected}
        onBack={() => {
          setSelected(null)
          setInitialCourtId(null)
        }}
        initialCourtId={initialCourtId}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 p-7">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.03em]" style={{ color: 'var(--text)' }}>
          {greeting},{' '}
          <em
            className="not-italic font-normal"
            style={{ fontFamily: 'Instrument Serif, serif', letterSpacing: '-0.01em', color: 'var(--green)' }}
          >
            {firstName}
          </em>
        </h1>
        <p className="mt-[6px] text-[13.5px]" style={{ color: 'var(--text-2)' }}>
          Elige un complejo y reserva tu próximo partido.
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[180px] rounded-2xl animate-pulse"
              style={{ background: 'var(--panel)' }}
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div
          className="rounded-xl px-5 py-4 text-sm"
          style={{ background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red)' }}
        >
          No se pudo conectar con el servidor. Intenta de nuevo más tarde.
        </div>
      )}

      {!loading && !error && venues.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--text-3)' }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            No hay complejos disponibles por el momento.
          </p>
        </div>
      )}

      {!loading && !error && venues.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((v) => (
            <VenueCard
              key={v.businessId}
              venue={v}
              onClick={() => {
                setSelected(v)
                setInitialCourtId(null)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
