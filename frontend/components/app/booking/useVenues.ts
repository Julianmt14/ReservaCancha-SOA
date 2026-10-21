'use client'

import { useCallback, useEffect, useState } from 'react'
import { getCourts, getSchedules, type ScheduleResponse } from '@/lib/api/courts'
import { getBookingsByCourt, type BookingResponse } from '@/lib/api/bookings'
import type { CourtAvailability } from './availability'

export interface Venue {
  businessId: number
  businessName: string
  address: string
  courts: CourtAvailability[]
}

const REFRESH_MS = 60_000

async function loadVenues(): Promise<Venue[]> {
  const page = await getCourts(0, 100)
  const avs = await Promise.all(
    page.content.map(async (court): Promise<CourtAvailability> => {
      const [schedules, bookings] = await Promise.all([
        getSchedules(court.id).catch(() => [] as ScheduleResponse[]),
        getBookingsByCourt(court.id)
          .then((p) => p.content)
          .catch(() => [] as BookingResponse[]),
      ])
      return { court, schedules, bookings }
    })
  )
  const map = new Map<number, Venue>()
  for (const av of avs) {
    const c = av.court
    if (!map.has(c.businessId)) {
      map.set(c.businessId, {
        businessId: c.businessId,
        businessName: c.businessName,
        address: c.address,
        courts: [],
      })
    }
    map.get(c.businessId)!.courts.push(av)
  }
  return [...map.values()]
}

/**
 * Complejos con sus canchas, horarios y ocupación. Se refresca cada minuto y al volver a la
 * pestaña para que los horarios ocupados no queden desactualizados.
 */
export function useVenues() {
  const [state, setState] = useState<{ venues: Venue[]; error: boolean; loaded: boolean }>({
    venues: [],
    error: false,
    loaded: false,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    loadVenues()
      .then((venues) => alive && setState({ venues, error: false, loaded: true }))
      .catch(() => alive && setState((s) => ({ ...s, error: !s.loaded, loaded: true })))
    return () => {
      alive = false
    }
  }, [version])

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    const timer = setInterval(bump, REFRESH_MS)
    const onVisible = () => document.visibilityState === 'visible' && bump()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { venues: state.venues, loading: !state.loaded, error: state.error, reload }
}
