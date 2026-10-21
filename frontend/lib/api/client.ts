const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Token JWT guardado por saveSession() (cookie `token`, tambien la lee el middleware). */
function storedToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

/** El backend responde `{ error: "mensaje", ... }`; devolvemos solo el mensaje. */
function errorMessage(raw: string, fallback: string): string {
  try {
    const body = JSON.parse(raw)
    if (typeof body?.error === 'string') return body.error
  } catch {
    // cuerpo que no es JSON
  }
  return raw || fallback
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const jwt = token || storedToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...init.headers,
    },
  })

  const text = await res.text().catch(() => '')
  if (!res.ok) throw new ApiError(res.status, errorMessage(text, res.statusText))

  // 204 / cuerpo vacio (por ejemplo DELETE)
  if (!text) return undefined as T

  return JSON.parse(text) as T
}
