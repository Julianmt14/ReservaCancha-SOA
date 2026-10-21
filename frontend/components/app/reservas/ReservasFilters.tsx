'use client'

import type { ReservasFilter } from '@/lib/types/dashboard'
import { IconSearch } from '@/components/app/icons'

const STATUS_TABS: { value: ReservasFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'canceled', label: 'Canceladas' },
]

interface Props {
  search: string
  onSearch: (v: string) => void
  filter: ReservasFilter
  onFilter: (v: ReservasFilter) => void
  court: string
  onCourt: (v: string) => void
  courtOptions: string[]
}

export default function ReservasFilters({
  search,
  onSearch,
  filter,
  onFilter,
  court,
  onCourt,
  courtOptions,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Tabs de estado */}
      <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-2)' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilter(tab.value)}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: filter === tab.value ? 'var(--panel-2)' : 'transparent',
              color: filter === tab.value ? 'var(--text)' : 'var(--text-3)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + cancha */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-3)' }}
        >
          <IconSearch />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar equipo o cancha…"
            className="bg-transparent outline-none w-44 text-xs placeholder:text-[var(--text-3)]"
            style={{ color: 'var(--text)' }}
          />
        </div>

        <select
          value={court}
          onChange={(e) => onCourt(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs outline-none cursor-pointer"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            color: 'var(--text-2)',
          }}
        >
          {courtOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
