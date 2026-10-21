import { apiFetch } from './client'
import { getCourt, type Page } from './courts'

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface BookingResponse {
  id: number
  bookingCode: string
  courtId: number
  courtName: string
  playerId: number
  playerName: string
  playerPhone?: string
  startAt: string // ISO 8601 local, sin zona horaria
  endAt: string // ISO 8601 local, sin zona horaria
  status: BookingStatus
  createdAt: string
}

export interface BookingRequest {
  courtId: number
  startAt: string // "YYYY-MM-DDTHH:mm:ss"
  endAt: string // "YYYY-MM-DDTHH:mm:ss"
}

/** Reserva completa, como la devuelven POST /api/reservas, /mias y cancelar. */
interface ReservaDto {
  id: number
  usuario: { id: number; nombre: string }
  cancha: { id: number; nombre: string }
  fecha: string
  horaInicio: string
  horaFin: string
  estado: string
  creadoEn: string
}

/** Bloque de ocupacion de GET /api/reservas/cancha/{id}; `jugador` solo lo ve el personal. */
interface OcupacionDto {
  id: number
  canchaId: number
  fecha: string
  horaInicio: string
  horaFin: string
  estado: string
  usuarioId: number
  jugador?: string
}

function toStatus(estado: string): BookingStatus {
  switch (estado) {
    case 'PAGADA':
    case 'CONFIRMADA':
      return 'CONFIRMED'
    case 'CANCELADA':
    case 'NO_SHOW':
      return 'CANCELLED'
    default:
      return 'PENDING'
  }
}

const bookingCode = (id: number) => `RC-${id}`

function toBooking(r: ReservaDto): BookingResponse {
  return {
    id: r.id,
    bookingCode: bookingCode(r.id),
    courtId: r.cancha.id,
    courtName: r.cancha.nombre,
    playerId: r.usuario.id,
    playerName: r.usuario.nombre,
    startAt: `${r.fecha}T${r.horaInicio}`,
    endAt: `${r.fecha}T${r.horaFin}`,
    status: toStatus(r.estado),
    createdAt: r.creadoEn,
  }
}

function paged(content: BookingResponse[], page: number, size: number): Page<BookingResponse> {
  return {
    content: content.slice(page * size, (page + 1) * size),
    totalElements: content.length,
    totalPages: Math.max(1, Math.ceil(content.length / size)),
    number: page,
    size,
  }
}

export async function createBooking(data: BookingRequest): Promise<BookingResponse> {
  const [fecha, horaInicio] = data.startAt.split('T')
  const horaFin = data.endAt.split('T')[1]
  const reserva = await apiFetch<ReservaDto>('/api/reservas', {
    method: 'POST',
    body: JSON.stringify({ canchaId: data.courtId, fecha, horaInicio, horaFin }),
  })
  return toBooking(reserva)
}

export async function getMyBookings(page = 0, size = 10, token?: string): Promise<Page<BookingResponse>> {
  const reservas = await apiFetch<ReservaDto[]>('/api/reservas/mias', {}, token)
  const ordered = reservas.map(toBooking).sort((a, b) => a.startAt.localeCompare(b.startAt))
  return paged(ordered, page, size)
}

export async function getBookingsByCourt(
  courtId: number,
  page = 0,
  size = 200,
  token?: string
): Promise<Page<BookingResponse>> {
  const [bloques, court] = await Promise.all([
    apiFetch<OcupacionDto[]>(`/api/reservas/cancha/${courtId}`, {}, token),
    getCourt(courtId, token),
  ])
  const content = bloques.map<BookingResponse>((b) => ({
    id: b.id,
    bookingCode: bookingCode(b.id),
    courtId,
    courtName: court.name,
    playerId: b.usuarioId,
    playerName: b.jugador ?? 'Reservado',
    startAt: `${b.fecha}T${b.horaInicio}`,
    endAt: `${b.fecha}T${b.horaFin}`,
    status: toStatus(b.estado),
    createdAt: '',
  }))
  return paged(content, page, size)
}

export async function cancelBooking(id: number): Promise<BookingResponse> {
  return toBooking(await apiFetch<ReservaDto>(`/api/reservas/${id}/cancelar`, { method: 'POST' }))
}
