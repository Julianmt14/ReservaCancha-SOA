// Disponibilidad calculada en el cliente a partir de los horarios (GET /api/horarios/cancha/{id})
// y la ocupación (GET /api/reservas/cancha/{id}). Misma lógica que buildSlots de CourtWeekCalendar,
// pero por día y con "hora primero, cancha después".

import type { CourtResponse, ScheduleResponse, DayOfWeek } from '@/lib/api/courts'
import type { BookingResponse } from '@/lib/api/bookings'
import { addDays, hourOf, isoDate, parseIsoDate } from '@/lib/format'

export interface CourtAvailability {
  court: CourtResponse
  schedules: ScheduleResponse[]
  bookings: BookingResponse[]
}

/**
 * Si una cancha no tiene ningún horario configurado, el backend acepta reservas a cualquier hora;
 * mostramos una franja por defecto en vez de dejarla sin horarios.
 */
export const DEFAULT_OPEN = 6
export const DEFAULT_CLOSE = 23
export const DAYS_AHEAD = 14

export type DayPart = 'manana' | 'tarde' | 'noche'
export const DAY_PART_LABEL: Record<DayPart, string> = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' }

export function dayPart(h: number): DayPart {
  if (h < 12) return 'manana'
  if (h < 18) return 'tarde'
  return 'noche'
}

const DOW: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

function parseHour(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h + (m || 0) / 60
}

export function nextDays(n = DAYS_AHEAD, from = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => isoDate(addDays(from, i)))
}

/** Franja de apertura de la cancha ese día, o null si está cerrada. */
export function openingHours(av: CourtAvailability, dateIso: string): { open: number; close: number } | null {
  if (!av.court.active) return null
  if (av.schedules.length === 0) return { open: DEFAULT_OPEN, close: DEFAULT_CLOSE }
  const dow = DOW[parseIsoDate(dateIso).getDay()]
  const s = av.schedules.find((x) => x.dayOfWeek === dow && x.active)
  if (!s) return null
  return { open: parseHour(s.openingTime), close: parseHour(s.closingTime) }
}

function nowHourFor(dateIso: string): number {
  const now = new Date()
  return dateIso === isoDate(now) ? now.getHours() + now.getMinutes() / 60 : -1
}

/** Reservas activas (no canceladas) de la cancha ese día. */
export function dayBookings(av: CourtAvailability, dateIso: string): BookingResponse[] {
  return av.bookings.filter((b) => b.status !== 'CANCELLED' && b.startAt.slice(0, 10) === dateIso)
}

export function isFree(av: CourtAvailability, dateIso: string, start: number, end: number): boolean {
  const hours = openingHours(av, dateIso)
  if (!hours || start < hours.open || end > hours.close) return false
  if (start <= nowHourFor(dateIso)) return false
  return !dayBookings(av, dateIso).some((b) => hourOf(b.startAt) < end && hourOf(b.endAt) > start)
}

export interface TimeOption {
  start: number
  end: number
  /** Canchas libres a esa hora, de la más económica a la más cara. */
  free: CourtAvailability[]
  minPrice: number | null
}

/** Horas de inicio del día (todas las canchas), cada hora en punto desde la apertura. */
export function timeOptions(avs: CourtAvailability[], dateIso: string, duration: number): TimeOption[] {
  const now = nowHourFor(dateIso)
  const starts = new Set<number>()
  for (const av of avs) {
    const hours = openingHours(av, dateIso)
    if (!hours) continue
    for (let h = hours.open; h + duration <= hours.close; h += 1) {
      if (h > now) starts.add(h)
    }
  }
  return [...starts]
    .sort((a, b) => a - b)
    .map((start) => {
      const end = start + duration
      const free = avs
        .filter((av) => isFree(av, dateIso, start, end))
        .sort((a, b) => a.court.pricePerHour - b.court.pricePerHour)
      return {
        start,
        end,
        free,
        minPrice: free.length ? free[0].court.pricePerHour * duration : null,
      }
    })
}

/** Próximas horas libres (1 h) de una cancha o de un grupo, para las tarjetas. */
export function nextFreeStarts(avs: CourtAvailability[], dateIso: string, limit = 5): TimeOption[] {
  return timeOptions(avs, dateIso, 1)
    .filter((o) => o.free.length > 0)
    .slice(0, limit)
}

export function freeCount(avs: CourtAvailability[], dateIso: string): number {
  return timeOptions(avs, dateIso, 1).filter((o) => o.free.length > 0).length
}

/** Fecha-hora local en el formato que espera createBooking: "YYYY-MM-DDTHH:mm:ss". */
export function toLocalDateTime(dateIso: string, hour: number): string {
  const hh = Math.floor(hour)
  const mm = Math.round((hour - hh) * 60)
  return `${dateIso}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
}
