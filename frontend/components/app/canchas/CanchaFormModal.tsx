'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/app/ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '@/components/app/ui/FormField'
import { createCourt, updateCourt, type CourtResponse, type SportType } from '@/lib/api/courts'
import { useBusiness } from '@/lib/context/business-context'
import { ApiError } from '@/lib/api/client'

const SPORT_OPTIONS = [
  { value: 'FUTBOL', label: 'Fútbol' },
  { value: 'PADEL', label: 'Pádel' },
  { value: 'VOLEIBOL', label: 'Voleibol' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (court: CourtResponse) => void
  editing?: CourtResponse | null
}

interface FormState {
  name: string
  sportType: SportType
  description: string
  pricePerHour: string
}

const EMPTY: FormState = { name: '', sportType: 'FUTBOL', description: '', pricePerHour: '' }

export default function CanchaFormModal({ open, onClose, onSaved, editing }: Props) {
  const { activeBusiness } = useBusiness()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      editing
        ? {
            name: editing.name,
            sportType: editing.sportType,
            description: editing.description ?? '',
            pricePerHour: String(editing.pricePerHour),
          }
        : EMPTY
    )
  }, [open, editing])

  function set(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(form.pricePerHour)
    if (!activeBusiness) {
      setError('No hay un negocio activo seleccionado.')
      return
    }
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (isNaN(price) || price <= 0) {
      setError('El precio debe ser mayor a 0.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const payload = {
        businessId: activeBusiness.id,
        name: form.name.trim(),
        sportType: form.sportType,
        description: form.description.trim() || undefined,
        pricePerHour: price,
      }
      const saved = editing ? await updateCourt(editing.id, payload) : await createCourt(payload)
      onSaved(saved)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError('Ya existe una cancha con ese nombre.')
      else if (err instanceof ApiError && err.status === 403)
        setError('No tienes permiso para realizar esta acción.')
      else setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const isEdit = !!editing

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar cancha' : 'Nueva cancha'} width="max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Nombre de la cancha">
                <Input value={form.name} onChange={set('name')} placeholder="Ej. Cancha Norte" required />
              </FormField>
            </div>

            <FormField label="Deporte">
              <Select
                value={form.sportType}
                onChange={(e) => setForm((prev) => ({ ...prev, sportType: e.target.value as SportType }))}
              >
                {SPORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Precio por hora (COP)">
              <Input
                type="number"
                min="0"
                step="1000"
                value={form.pricePerHour}
                onChange={set('pricePerHour')}
                placeholder="50000"
                required
              />
            </FormField>

            <div className="col-span-2">
              <FormField label="Descripción (opcional)">
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Césped sintético, iluminación LED, parqueadero…"
                />
              </FormField>
            </div>
          </div>

          {error && (
            <p
              className="text-xs rounded-lg px-3 py-2"
              style={{ color: 'var(--red)', background: 'var(--red-soft)' }}
            >
              {error}
            </p>
          )}
        </div>

        <SubmitRow onCancel={onClose} loading={loading} label={isEdit ? 'Guardar cambios' : 'Crear cancha'} />
      </form>
    </Modal>
  )
}
