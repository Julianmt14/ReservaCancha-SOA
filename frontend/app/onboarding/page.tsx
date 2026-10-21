'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBusiness } from '@/lib/api/businesses'
import { useBusiness } from '@/lib/context/business-context'
import { ApiError } from '@/lib/api/client'

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = true,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </label>
      <input
        id={id}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--green)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
      />
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { reload } = useBusiness()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [department, setDepartment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !address.trim() || !city.trim() || !department.trim()) {
      setError('Completa todos los campos obligatorios.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await createBusiness({
        name: name.trim(),
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        department: department.trim(),
      })
      await reload()
      router.push('/')
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setError('No tienes permiso para crear un negocio.')
      else setError('No se pudo crear el negocio. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center size-14 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--green), var(--green-deep))',
              boxShadow: '0 8px 24px rgba(27,158,75,0.35)',
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
            Registra tu negocio
          </h1>
          <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
            Para empezar a usar ReservaCancha necesitas registrar al menos un negocio.
          </p>
        </div>

        {/* Form */}
        <div
          className="rounded-2xl p-7"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              id="name"
              label="Nombre del negocio *"
              value={name}
              onChange={setName}
              placeholder="Ej. Canchas El Parque"
            />
            <Field
              id="phone"
              label="Teléfono"
              value={phone}
              onChange={setPhone}
              placeholder="3001234567"
              required={false}
            />
            <Field
              id="address"
              label="Dirección *"
              value={address}
              onChange={setAddress}
              placeholder="Calle 123 # 45-67"
            />
            <div className="grid grid-cols-2 gap-4">
              <Field id="city" label="Ciudad *" value={city} onChange={setCity} placeholder="Bogotá" />
              <Field
                id="department"
                label="Departamento *"
                value={department}
                onChange={setDepartment}
                placeholder="Cundinamarca"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="desc"
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-3)' }}
              >
                Descripción (opcional)
              </label>
              <textarea
                id="desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Las mejores canchas de la ciudad…"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--green)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
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
              className="w-full rounded-xl py-3 text-[14px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
              style={{ background: 'var(--green)', color: '#fff' }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = 'var(--green-deep)'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = 'var(--green)'
              }}
            >
              {loading ? 'Creando negocio…' : 'Crear negocio y continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
