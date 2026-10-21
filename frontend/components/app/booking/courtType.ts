import type { CourtResponse, SportType } from '@/lib/api/courts'

const SPORT_LABEL: Record<SportType, string> = {
  FUTBOL: 'Fútbol',
  PADEL: 'Pádel',
  VOLEIBOL: 'Voleibol',
}

/** "Fútbol 5", "Fútbol 8"… (el backend guarda el tipo en `description`). */
export function courtTypeLabel(court: CourtResponse): string {
  return court.description?.trim() || SPORT_LABEL[court.sportType]
}
