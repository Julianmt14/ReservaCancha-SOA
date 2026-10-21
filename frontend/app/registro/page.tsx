'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerPlayer, registerOwner } from '@/lib/api/users'
import { ApiError } from '@/lib/api/client'

type Role = 'player' | 'owner'

const LOGO = (
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
)

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--green)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
      />
    </div>
  )
}

export default function RegistroPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('player')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const fn = role === 'owner' ? registerOwner : registerPlayer
      await fn({ fullName, email, phone, password })
      router.push('/login')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Ya existe una cuenta con ese correo.')
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Revisa los datos ingresados.')
      } else {
        setError('No se pudo conectar con el servidor.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-8"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
      >
        {/* Logo */}
        <div className="mb-6 text-center">
          {LOGO}
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Crear cuenta
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            Elige tu tipo de cuenta para continuar
          </p>
        </div>

        {/* Toggle de rol */}
        <div className="flex rounded-lg p-1 mb-6" style={{ background: 'var(--bg-2)' }}>
          {(
            [
              { value: 'player', label: 'Jugador', desc: 'Reserva canchas' },
              { value: 'owner', label: 'Dueño de cancha', desc: 'Administra tu complejo' },
            ] as { value: Role; label: string; desc: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className="flex-1 rounded-md px-4 py-3 text-left transition-all cursor-pointer"
              style={{
                background: role === opt.value ? 'var(--panel-2)' : 'transparent',
                border: role === opt.value ? '1px solid var(--line-2)' : '1px solid transparent',
              }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: role === opt.value ? 'var(--text)' : 'var(--text-3)' }}
              >
                {opt.label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="fullName"
              label="Nombre completo"
              value={fullName}
              onChange={setFullName}
              placeholder="Tu nombre completo"
              autoComplete="name"
            />
            <Field
              id="phone"
              label="Teléfono"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="300 000 0000"
              autoComplete="tel"
            />
          </div>
          <Field
            id="email"
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tu@email.com"
            autoComplete="email"
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="password"
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            <Field
              id="confirm"
              label="Confirmar contraseña"
              type="password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
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
              background: 'var(--green)',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--green-deep)'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--green)'
            }}
          >
            {loading ? 'Creando cuenta…' : `Registrarme como ${role === 'owner' ? 'dueño' : 'jugador'}`}
          </button>
        </form>

        <p className="mt-5 text-center text-xs" style={{ color: 'var(--text-3)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--green)' }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
