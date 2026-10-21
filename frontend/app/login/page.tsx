'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { ApiError } from '@/lib/api/client'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ email, password })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Credenciales incorrectas.')
      } else {
        setError('No se pudo conectar con el servidor.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
      >
        {/* Logo / título */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: 'var(--green)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
                fill="white"
              />
            </svg>
          </div>
          <h1
            className="text-xl font-semibold"
            style={{ color: 'var(--text)', fontFamily: 'var(--font-sans)' }}
          >
            ReservaCancha
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            Accede a tu panel de administración
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
                fontFamily: 'var(--font-sans)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--green)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
              placeholder="tu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
                fontFamily: 'var(--font-sans)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--green)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              className="text-xs rounded-lg px-3 py-2"
              style={{ color: 'var(--red)', background: 'var(--red-soft)' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
            style={{
              background: loading ? 'var(--green-deep)' : 'var(--green)',
              color: 'white',
              fontFamily: 'var(--font-sans)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--green-deep)'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--green)'
            }}
          >
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>

          <Link
            href="/registro"
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-center transition-colors block"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              color: 'var(--text-2)',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--line-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
          >
            Crear cuenta
          </Link>
        </form>
      </div>
    </div>
  )
}
