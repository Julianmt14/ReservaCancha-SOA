import type { BookingResponse } from '@/lib/api/bookings'

export type ReservationStatus = 'confirmed' | 'pending' | 'canceled'
export type ReservasFilter = 'all' | ReservationStatus

export interface Reservation {
  id: string
  day: number
  startHour: number
  endHour: number
  status: ReservationStatus
  team: string
  detail: string
  booking?: BookingResponse
}

export interface WeekDay {
  label: string
  date: number
  today?: boolean
}

export type IconVariant = 'green' | 'blue' | 'amber' | 'red'

export interface StatItem {
  id: string
  label: string
  value: React.ReactNode
  deltaDir: 'up' | 'down' | 'neutral'
  deltaLabel: string
  subLabel: string
  iconVariant: IconVariant
  icon: React.ReactNode
  sparkline?: { points: string; color: string; fill: string }
  ring?: { pct: number }
}
