'use client'

import { useState, useMemo, useEffect } from 'react'
import CanchasStats from './CanchasStats'
import CanchasFilters from './CanchasFilters'
import CanchaCard from './CanchaCard'
import CanchaFormModal from './CanchaFormModal'
import CanchaAdminDetail from './CanchaAdminDetail'
import { IconPlus } from '@/components/app/icons'
import { getCourts, getSchedules, type CourtResponse, type ScheduleResponse } from '@/lib/api/courts'
import { getBookingsByCourt, type BookingResponse } from '@/lib/api/bookings'
import { useBusiness } from '@/lib/context/business-context'
import type { CanchasFilter } from '@/lib/types/canchas'

export interface CourtWithData {
  court: CourtResponse
  bookings: BookingResponse[]
  schedules: ScheduleResponse[]
}

export default function CanchasView() {
  const { activeBusiness } = useBusiness()
  const [courtsData, setCourtsData] = useState<CourtWithData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CanchasFilter>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CourtResponse | null>(null)
  const [selectedCourt, setSelectedCourt] = useState<CourtResponse | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const page = await getCourts(0, 50)
      const bizCourts = activeBusiness
        ? page.content.filter((c) => c.businessId === activeBusiness.id)
        : page.content

      const results = await Promise.all(
        bizCourts.map(async (court) => {
          const [bookingsPage, schedules] = await Promise.all([
            getBookingsByCourt(court.id, 0, 500).catch(() => ({ content: [] as BookingResponse[] })),
            getSchedules(court.id).catch(() => [] as ScheduleResponse[]),
          ])
          return { court, bookings: bookingsPage.content, schedules }
        })
      )
      setCourtsData(results)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeBusiness?.id])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return courtsData.filter(({ court }) => {
      if (filter === 'activa' && !court.active) return false
      if (filter === 'inactiva' && court.active) return false
      if (q && !court.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [courtsData, filter, search])

  function handleSaved(court: CourtResponse) {
    setCourtsData((prev) => {
      const exists = prev.find((d) => d.court.id === court.id)
      if (exists) return prev.map((d) => (d.court.id === court.id ? { ...d, court } : d))
      return [...prev, { court, bookings: [], schedules: [] }]
    })
  }

  function handleUpdated(court: CourtResponse) {
    handleSaved(court)
    setSelectedCourt(court)
  }

  function handleDeleted(id: number) {
    setCourtsData((prev) => prev.filter((d) => d.court.id !== id))
    setSelectedCourt(null)
  }

  if (selectedCourt) {
    return (
      <CanchaAdminDetail
        court={selectedCourt}
        onBack={() => setSelectedCourt(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Canchas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Administra las canchas, tarifas y disponibilidad del complejo.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
          style={{ background: 'var(--green)', color: '#fff' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--green-deep)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--green)')}
        >
          <IconPlus />
          Nueva cancha
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-52 rounded-[14px] animate-pulse"
              style={{ background: 'var(--panel)' }}
            />
          ))}
        </div>
      ) : (
        <>
          <CanchasStats courtsData={courtsData} />

          <div className="flex flex-col gap-4">
            <CanchasFilters
              search={search}
              onSearch={(v) => setSearch(v)}
              filter={filter}
              onFilter={(v) => setFilter(v)}
            />

            {filtered.length === 0 ? (
              <div
                className="rounded-[14px] px-6 py-12 text-center text-sm"
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  color: 'var(--text-3)',
                }}
              >
                {courtsData.length === 0
                  ? 'Aún no tienes canchas registradas. Crea la primera.'
                  : 'No hay canchas que coincidan con los filtros.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map(({ court, bookings, schedules }) => (
                  <CanchaCard
                    key={court.id}
                    court={court}
                    bookings={bookings}
                    schedules={schedules}
                    onClick={() => setSelectedCourt(court)}
                    onEdit={() => {
                      setEditing(court)
                      setModalOpen(true)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <CanchaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        editing={editing}
      />
    </div>
  )
}
