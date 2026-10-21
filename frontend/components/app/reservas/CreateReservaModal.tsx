'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/app/ui/Modal'
import { FormField, Input, Select, SubmitRow } from '@/components/app/ui/FormField'
import { getCourts, type CourtResponse } from '@/lib/api/courts'
import { createBooking, type BookingResponse } from '@/lib/api/bookings'
import { ApiError } from '@/lib/api/client'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (booking: BookingResponse) => void
  preselectedCourtId?: number
  preselectedDate?: string
  preselectedStart?: string
  preselectedEnd?: string
}

export default function CreateReservaModal({
  open,
  onClose,
  onSaved,
  preselectedCourtId,
  preselectedDate,
  preselectedStart,
  preselectedEnd,
}: Props) {
  const [courts, setCourts] = useState<CourtResponse[]>([])
  const [courtId, setCourtId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStart] = useState('')
  const [endTime, setEnd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    getCourts(0, 50)
      .then((p) => {
        const active = p.content.filter((c) => c.active)
        setCourts(active)
        if (preselectedCourtId) {
          setCourtId(String(preselectedCourtId))
        } else if (active.length > 0) {
          setCourtId(String(active[0].id))
        }
      })
      .catch(() => {})

    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setDate(preselectedDate || today)
    setStart(preselectedStart || '08:00')
    setEnd(preselectedEnd || '09:00')
  }, [open, preselectedCourtId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!courtId) {
      setError('Selecciona una cancha.')
      return
    }
    if (!date) {
      setError('Selecciona una fecha.')
      return
    }
    if (startTime >= endTime) {
      setError('La hora de fin debe ser posterior a la de inicio.')
      return
    }

    const startAt = `${date}T${startTime}:00`
    const endAt = `${date}T${endTime}:00`

    setError(null)
    setLoading(true)
    try {
      const booking = await createBooking({ courtId: Number(courtId), startAt, endAt })
      onSaved(booking)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError('Ese horario ya está reservado.')
      else if (err instanceof ApiError && err.status === 400)
        setError('Datos inválidos. Revisa la fecha y horario.')
      else setError('No se pudo crear la reserva. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <Modal open={open} onClose={onClose} title="Nueva reserva">
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 flex flex-col gap-4">
          <FormField label="Cancha">
            <Select value={courtId} onChange={(e) => setCourtId(e.target.value)} required>
              {courts.length === 0 ? (
                <option value="">Cargando canchas…</option>
              ) : (
                courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </Select>
          </FormField>

          <FormField label="Fecha">
            <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Hora inicio">
              <Input
                type="time"
                value={startTime}
                step="1800"
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Hora fin">
              <Input
                type="time"
                value={endTime}
                step="1800"
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </FormField>
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

        <SubmitRow onCancel={onClose} loading={loading} label="Crear reserva" />
      </form>
    </Modal>
  )
}
