'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBusiness } from '@/lib/context/business-context'
import { getBusinessPayments } from '@/lib/api/payments'
import type { BusinessPaymentResponse, PaymentStatus } from '@/lib/api/payments'
import PagosStats from './PagosStats'
import PagosFilters from './PagosFilters'
import PagosTable from './PagosTable'
import PagoDetailModal from './PagoDetailModal'

export type PagosFilter = 'all' | PaymentStatus

const PAGE_SIZE = 12

export default function PagosView() {
  const { activeBusiness } = useBusiness()
  const [rows, setRows] = useState<BusinessPaymentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<PagosFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<BusinessPaymentResponse | null>(null)

  useEffect(() => {
    if (!activeBusiness) return
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        // Load up to 500 rows — the list isn't infinite, paging happens in the UI
        const result = await getBusinessPayments(activeBusiness!.id, 0, 500)
        if (!cancelled) {
          setRows(result.content)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeBusiness])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      if (filter !== 'all' && r.paymentStatus !== filter) return false
      if (q && ![r.playerName, r.bookingCode, r.courtName].some((s) => s.toLowerCase().includes(q)))
        return false
      return true
    })
  }, [rows, filter, search])

  const handleFilter = (v: PagosFilter) => {
    setFilter(v)
    setPage(1)
  }
  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <PagosStats rows={rows} loading={loading} />
        <div className="flex flex-col gap-4">
          <PagosFilters search={search} onSearch={handleSearch} filter={filter} onFilter={handleFilter} />
          <PagosTable
            rows={filtered}
            page={page}
            pageSize={PAGE_SIZE}
            onPage={setPage}
            loading={loading}
            onRowClick={setSelected}
          />
        </div>
      </div>
      <PagoDetailModal payment={selected} onClose={() => setSelected(null)} />
    </>
  )
}
