'use client'

import { useState, useMemo } from 'react'
import TorneosStats from './TorneosStats'
import TorneosFilters from './TorneosFilters'
import TorneoCard from './TorneoCard'
import type { Torneo, TorneosFilter } from '@/lib/types/torneos'

interface Props {
  torneos: Torneo[]
}

export default function TorneosView({ torneos }: Props) {
  const [filter, setFilter] = useState<TorneosFilter>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return torneos.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false
      if (q && !t.name.toLowerCase().includes(q) && !t.courts.join(' ').toLowerCase().includes(q))
        return false
      return true
    })
  }, [torneos, filter, search])

  return (
    <div className="flex flex-col gap-6">
      <TorneosStats torneos={torneos} />

      <div className="flex flex-col gap-4">
        <TorneosFilters
          search={search}
          onSearch={(v) => setSearch(v)}
          filter={filter}
          onFilter={(v) => setFilter(v)}
        />

        {filtered.length === 0 ? (
          <div
            className="rounded-[14px] px-6 py-12 text-center text-sm"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text-3)' }}
          >
            No hay torneos que coincidan con los filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => (
              <TorneoCard key={t.id} torneo={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
