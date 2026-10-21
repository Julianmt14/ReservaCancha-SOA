import { apiFetch } from './client'
import { ESTABLISHMENT } from './businesses'

export type SportType = 'FUTBOL' | 'PADEL' | 'VOLEIBOL'

export interface CourtResponse {
  id: number
  name: string
  sportType: SportType
  address: string
  description: string | null
  pricePerHour: number
  photoUrl: string | null
  businessId: number
  businessName: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CourtRequest {
  businessId: number
  name: string
  sportType: SportType
  description?: string
  pricePerHour: number
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface ScheduleResponse {
  id: number
  courtId: number
  dayOfWeek: DayOfWeek
  openingTime: string // "HH:mm"
  closingTime: string // "HH:mm"
  active: boolean
}

export interface ScheduleRequest {
  dayOfWeek: DayOfWeek
  openingTime: string
  closingTime: string
}

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

/** Cancha tal como la entrega /api/canchas. */
interface CanchaDto {
  id: number
  nombre: string
  tipo: string | null
  superficie: string | null
  ubicacion: string | null
  precioHora: number
  activa: boolean
}

/** Horario tal como lo entrega /api/horarios. */
interface HorarioDto {
  id: number
  cancha: { id: number }
  diaSemana: DayOfWeek
  horaApertura: string
  horaCierre: string
  activo: boolean
}

const SPORT_LABEL: Record<SportType, string> = {
  FUTBOL: 'Fútbol',
  PADEL: 'Pádel',
  VOLEIBOL: 'Voleibol',
}

function sportOf(tipo: string | null): SportType {
  const t = (tipo ?? '').toLowerCase()
  if (t.includes('pádel') || t.includes('padel')) return 'PADEL'
  if (t.includes('volei')) return 'VOLEIBOL'
  return 'FUTBOL'
}

function toCourt(c: CanchaDto): CourtResponse {
  return {
    id: c.id,
    name: c.nombre,
    sportType: sportOf(c.tipo),
    address: c.ubicacion ?? ESTABLISHMENT.address,
    description: c.tipo,
    pricePerHour: Number(c.precioHora),
    photoUrl: null,
    businessId: ESTABLISHMENT.id,
    businessName: ESTABLISHMENT.name,
    active: c.activa,
    createdAt: '',
    updatedAt: '',
  }
}

const hhmm = (t: string) => t.slice(0, 5)

function toSchedule(h: HorarioDto): ScheduleResponse {
  return {
    id: h.id,
    courtId: h.cancha.id,
    dayOfWeek: h.diaSemana,
    openingTime: hhmm(h.horaApertura),
    closingTime: hhmm(h.horaCierre),
    active: h.activo,
  }
}

function toCanchaBody(data: CourtRequest, current?: CanchaDto) {
  return {
    nombre: data.name,
    // `description` de la pantalla corresponde al tipo de cancha (ej. "Fútbol 5")
    tipo: data.description?.trim() || SPORT_LABEL[data.sportType],
    superficie: current?.superficie ?? null,
    ubicacion: current?.ubicacion ?? ESTABLISHMENT.address,
    precioHora: data.pricePerHour,
    activa: current?.activa ?? true,
  }
}

export async function getCourts(page = 0, size = 20, token?: string): Promise<Page<CourtResponse>> {
  const canchas = await apiFetch<CanchaDto[]>('/api/canchas', {}, token)
  const content = canchas.slice(page * size, (page + 1) * size).map(toCourt)
  return {
    content,
    totalElements: canchas.length,
    totalPages: Math.max(1, Math.ceil(canchas.length / size)),
    number: page,
    size,
  }
}

export async function getCourt(id: number, token?: string): Promise<CourtResponse> {
  return toCourt(await apiFetch<CanchaDto>(`/api/canchas/${id}`, {}, token))
}

export async function createCourt(data: CourtRequest): Promise<CourtResponse> {
  const created = await apiFetch<CanchaDto>('/api/canchas', {
    method: 'POST',
    body: JSON.stringify(toCanchaBody(data)),
  })
  return toCourt(created)
}

export async function updateCourt(id: number, data: CourtRequest): Promise<CourtResponse> {
  const current = await apiFetch<CanchaDto>(`/api/canchas/${id}`)
  const updated = await apiFetch<CanchaDto>(`/api/canchas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toCanchaBody(data, current)),
  })
  return toCourt(updated)
}

/** El backend no borra canchas: la baja es logica (activa = false) y conserva las reservas. */
export async function deleteCourt(id: number): Promise<void> {
  const current = await apiFetch<CanchaDto>(`/api/canchas/${id}`)
  await apiFetch(`/api/canchas/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...current, activa: false }),
  })
}

export async function getSchedules(courtId: number, token?: string): Promise<ScheduleResponse[]> {
  const horarios = await apiFetch<HorarioDto[]>(`/api/horarios/cancha/${courtId}`, {}, token)
  return horarios.map(toSchedule)
}

function toHorarioBody(courtId: number, data: ScheduleRequest) {
  return {
    canchaId: courtId,
    diaSemana: data.dayOfWeek,
    horaApertura: data.openingTime,
    horaCierre: data.closingTime,
  }
}

export async function createSchedule(courtId: number, data: ScheduleRequest): Promise<ScheduleResponse> {
  const created = await apiFetch<HorarioDto>('/api/horarios', {
    method: 'POST',
    body: JSON.stringify(toHorarioBody(courtId, data)),
  })
  return toSchedule(created)
}

export async function updateSchedule(
  courtId: number,
  scheduleId: number,
  data: ScheduleRequest
): Promise<ScheduleResponse> {
  const updated = await apiFetch<HorarioDto>(`/api/horarios/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify(toHorarioBody(courtId, data)),
  })
  return toSchedule(updated)
}

export function deleteSchedule(_courtId: number, scheduleId: number): Promise<void> {
  return apiFetch(`/api/horarios/${scheduleId}`, { method: 'DELETE' })
}
