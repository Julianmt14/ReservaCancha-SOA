export type TorneoStatus = 'activo' | 'en-preparacion' | 'finalizado'
export type TorneoFormat = 'F-5' | 'F-8' | 'F-11'

export interface Torneo {
  id: string
  name: string
  format: TorneoFormat
  status: TorneoStatus
  startDate: string
  endDate: string
  courts: string[]
  maxTeams: number
  registeredTeams: number
  pricePerTeam: number
  totalRevenue: number
  matchesPlayed: number
  matchesTotal: number
  champion?: string
}

export type TorneosFilter = 'all' | TorneoStatus
