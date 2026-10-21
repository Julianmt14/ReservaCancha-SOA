'use client'

import { useState } from 'react'
import type { ScheduleResponse, ScheduleRequest } from '@/lib/api/courts'
import { createSchedule } from '@/lib/api/courts'
import Modal from '@/components/app/ui/Modal'
import { FormField, Input, Select, SubmitRow } from '@/components/app/ui/FormField'

const DAYS: { value: ScheduleRequest['dayOfWeek']; label: string }[] = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
]

interface Props {
  open: boolean
  onClose: () => void
  courtId: number
  existing: ScheduleResponse[]
  onSaved: (schedule: ScheduleResponse) => void
}

export default function ScheduleModal({ open, onClose, courtId, existing, onSaved }: Props) {
  const usedDays = new Set(existing.map((s) => s.dayOfWeek))
  const availableDays = DAYS.filter((d) => !usedDays.has(d.value))

  const [dayOfWeek, setDayOfWeek] = useState<ScheduleRequest['dayOfWeek']>(
    availableDays[0]?.value ?? 'MONDAY'
  )
  const [openingTime, setOpeningTime] = useState('08:00')
  const [closingTime, setClosingTime] = useState('22:00')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (openingTime >= closingTime) {
      setError('La hora de apertura debe ser anterior al cierre.')
      return
    }

    setSaving(true)
    try {
      const schedule = await createSchedule(courtId, { dayOfWeek, openingTime, closingTime })
      onSaved(schedule)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el horario.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  if (availableDays.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Agregar horario">
        <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-2)' }}>
          Ya tienes horarios configurados para todos los días de la semana.
        </div>
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--line)' }}
          >
            Cerrar
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar horario">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex flex-col gap-4 px-6 py-5">
          <FormField label="Día de la semana">
            <Select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value as ScheduleRequest['dayOfWeek'])}
              required
            >
              {availableDays.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Apertura">
              <Input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Cierre">
              <Input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                required
              />
            </FormField>
          </div>

          {error && (
            <p
              className="text-[12.5px] rounded-lg px-3 py-2"
              style={{ background: 'var(--red-soft)', color: 'var(--red)' }}
            >
              {error}
            </p>
          )}
        </div>

        <SubmitRow onCancel={onClose} loading={saving} label="Guardar horario" />
      </form>
    </Modal>
  )
}
