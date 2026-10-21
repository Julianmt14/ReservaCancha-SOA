import { apiFetch } from './client'

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  tokenType: string
  expiresInMs: number
  userId: number
  email: string
  fullName: string
  role: 'JUGADOR' | 'ADMIN_CANCHA' | 'ORGANIZADOR' | 'SUPER_ADMIN'
}

/** Respuesta de POST /api/auth/login del backend. */
interface LoginDto {
  token: string
  email: string
  rol: 'ADMIN' | 'JUGADOR' | 'PROPIETARIO'
  id: number
  nombre: string
}

const DEFAULT_EXPIRATION_MS = 24 * 60 * 60 * 1000

/** Administrador y propietario comparten el panel de gestion; el jugador ve la vista de reservas. */
function toRole(rol: LoginDto['rol']): AuthResponse['role'] {
  return rol === 'JUGADOR' ? 'JUGADOR' : 'ADMIN_CANCHA'
}

/** Milisegundos que le quedan al token segun su claim `exp`; si no se puede leer, 24 h. */
function remainingMs(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (typeof payload.exp === 'number') return Math.max(payload.exp * 1000 - Date.now(), 0)
  } catch {
    // token con formato inesperado
  }
  return DEFAULT_EXPIRATION_MS
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const dto = await apiFetch<LoginDto>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return {
    token: dto.token,
    tokenType: 'Bearer',
    expiresInMs: remainingMs(dto.token),
    userId: dto.id,
    email: dto.email,
    fullName: dto.nombre,
    role: toRole(dto.rol),
  }
}

const MAX_AGE = (ms: number) => Math.floor(ms / 1000)

export function saveSession(auth: AuthResponse): void {
  // Cookie `token`: la envia apiFetch como Bearer y la lee el middleware de Next.js para proteger rutas
  document.cookie = `token=${auth.token}; path=/; max-age=${MAX_AGE(auth.expiresInMs)}; SameSite=Lax`
  // Perfil en localStorage (sin el token)
  localStorage.setItem(
    'user',
    JSON.stringify({
      userId: auth.userId,
      email: auth.email,
      fullName: auth.fullName,
      role: auth.role,
    })
  )
}

export function clearSession(): void {
  document.cookie = 'token=; path=/; max-age=0'
  localStorage.removeItem('user')
}

export function getStoredUser(): AuthResponse | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    const u = JSON.parse(raw)
    return { ...u, token: '', tokenType: 'Bearer', expiresInMs: 0 }
  } catch {
    return null
  }
}
