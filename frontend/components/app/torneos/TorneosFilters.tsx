'use client'

import type { TorneosFilter } from '@/lib/types/torneos'
import { IconSearch } from '@/components/app/icons'

const TABS: { value: TorneosFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'en-preparacion', label: 'En preparación' },
  { value: 'finalizado', label: 'Finalizados' },
]

interface Props {
  search: string
  onSearch: (v: string) => void
  filter: TorneosFilter
  onFilter: (v: TorneosFilter) => void
}

export default function TorneosFilters({ search, onSearch, filter, onFilter }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-2)' }}>
        {TABS.map((tab) => (
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

      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-3)' }}
      >
        <IconSearch />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar torneo…"
          className="bg-transparent outline-none w-44 text-xs placeholder:text-[var(--text-3)]"
          style={{ color: 'var(--text)' }}
        />
      </div>
    </div>
  )
}
