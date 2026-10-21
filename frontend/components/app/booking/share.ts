import type { BookingResponse } from '@/lib/api/bookings'
import { formatDayLong, formatHour, hourOf } from '@/lib/format'

export function mapsUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
}

/** Enlace de WhatsApp con el mensaje prellenado para invitar al partido. */
export function whatsappShareUrl(b: BookingResponse, venueName: string): string {
  const day = formatDayLong(b.startAt.slice(0, 10))
  const text =
    `⚽ Reservé cancha: ${b.courtName} en ${venueName}.\n` +
    `📅 ${day.charAt(0).toUpperCase() + day.slice(1)}, ${formatHour(hourOf(b.startAt))}–${formatHour(hourOf(b.endAt))}.\n` +
    `Código ${b.bookingCode}. ¿Quién se apunta?`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

function icsStamp(localIso: string): string {
  // "2026-10-17T19:00:00" → "20261017T190000" (hora local de Colombia)
  return localIso.slice(0, 19).replace(/[-:]/g, '')
}

/** Descarga un .ics para añadir el partido al calendario del teléfono. */
export function downloadIcs(b: BookingResponse, venueName: string, address: string): void {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ReservaCancha//ES',
    'BEGIN:VEVENT',
    `UID:${b.bookingCode}@reservacancha`,
    `DTSTART;TZID=America/Bogota:${icsStamp(b.startAt)}`,
    `DTEND;TZID=America/Bogota:${icsStamp(b.endAt)}`,
    `SUMMARY:Partido · ${b.courtName}`,
    `LOCATION:${venueName}, ${address}`,
    `DESCRIPTION:Reserva ${b.bookingCode}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `reserva-${b.bookingCode}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
