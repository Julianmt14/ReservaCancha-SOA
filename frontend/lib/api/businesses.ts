// La v1.0 del backend administra un unico establecimiento, asi que no hay API de negocios:
// el "negocio" es fijo y se configura por variables de entorno del frontend.

export interface BusinessResponse {
  id: number
  name: string
  description: string | null
  phone: string | null
  address: string
  city: string
  department: string
  logoUrl: string | null
  ownerId: number
  ownerName: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface BusinessRequest {
  name: string
  description?: string
  phone?: string
  address: string
  city: string
  department: string
}

export const ESTABLISHMENT: BusinessResponse = {
  id: 1,
  name: process.env.NEXT_PUBLIC_ESTABLISHMENT_NAME ?? 'ReservaCancha Villavicencio',
  description: null,
  phone: null,
  address: process.env.NEXT_PUBLIC_ESTABLISHMENT_ADDRESS ?? 'Villavicencio, Meta',
  city: 'Villavicencio',
  department: 'Meta',
  logoUrl: null,
  ownerId: 0,
  ownerName: '',
  active: true,
  createdAt: '',
  updatedAt: '',
}

export async function getMyBusinesses(): Promise<BusinessResponse[]> {
  return [ESTABLISHMENT]
}

export async function getBusiness(): Promise<BusinessResponse> {
  return ESTABLISHMENT
}

export async function createBusiness(_data: BusinessRequest): Promise<BusinessResponse> {
  return ESTABLISHMENT
}
