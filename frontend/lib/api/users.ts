import { apiFetch } from './client'

export interface RegisterRequest {
  fullName: string
  email: string
  phone: string
  password: string
}

type RegistrationRole = 'JUGADOR' | 'PROPIETARIO'

// El backend v1.0 no guarda telefono: el registro envia nombre, correo, clave y rol.
function register(data: RegisterRequest, rol: RegistrationRole) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nombre: data.fullName, email: data.email, password: data.password, rol }),
  })
}

export function registerPlayer(data: RegisterRequest) {
  return register(data, 'JUGADOR')
}

export function registerOwner(data: RegisterRequest) {
  return register(data, 'PROPIETARIO')
}
