import type { BusinessPaymentResponse } from '@/lib/api/payments'
import PagoStatusBadge from './PagoStatusBadge'

function fmt(cents: number) {
  return '$' + Math.round(cents / 100).toLocaleString('es-CO')
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  )
}

function methodLabel(method: string | null) {
  if (!method) return '—'
  if (method.toUpperCase().includes('CARD')) return 'Tarjeta'
  if (method.toUpperCase().includes('NEQUI')) return 'Nequi'
  if (method.toUpperCase().includes('PSE')) return 'PSE'
  if (method.toUpperCase().includes('CASH')) return 'Efectivo'
  return method
}

const HEADERS = ['Fecha', 'Cancha', 'Jugador', 'Método', 'Monto', 'Estado']

interface Props {
  rows: BusinessPaymentResponse[]
  page: number
  pageSize: number
  onPage: (p: number) => void
  loading: boolean
  onRowClick: (row: BusinessPaymentResponse) => void
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--line)' }}>
      {HEADERS.map((h) => (
        <td key={h} className="px-4 py-3">
          <div className="h-3 rounded animate-pulse" style={{ background: 'var(--panel-2)', width: '70%' }} />
        </td>
      ))}
    </tr>
  )
}

export default function PagosTable({ rows, page, pageSize, onPage, loading, onRowClick }: Props) {
  const totalPages = Math.ceil(rows.length / pageSize)
  const slice = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
              {HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em]"
                  style={{ color: 'var(--text-3)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : slice.length === 0 ? (
              <tr>
                <td
                  colSpan={HEADERS.length}
                  className="px-4 py-10 text-center text-xs"
                  style={{ color: 'var(--text-3)' }}
                >
                  No hay pagos que coincidan.
                </td>
              </tr>
            ) : (
              slice.map((row, i) => (
                <tr
                  key={row.paymentId}
                  onClick={() => onRowClick(row)}
                  style={{
                    background: i % 2 === 0 ? 'var(--panel)' : 'var(--panel-2)',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = i % 2 === 0 ? 'var(--panel)' : 'var(--panel-2)')
                  }
                >
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: 'var(--text-2)' }}>
                    {formatDateTime(row.paymentCreatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                      {row.courtName}
                    </div>
                    <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      #{row.bookingCode}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                      {row.playerName}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {row.playerPhone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>
                    {methodLabel(row.paymentMethod)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--text)' }}>
                    {fmt(row.amountInCents)}{' '}
                    <span className="text-[10px] font-normal" style={{ color: 'var(--text-3)' }}>
                      COP
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <PagoStatusBadge status={row.paymentStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 text-xs"
          style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--text-3)' }}
        >
          <span>
            {rows.length} pagos · página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPage(p)}
                className="size-7 rounded-md text-xs font-medium cursor-pointer"
                style={{
                  background: p === page ? 'var(--green)' : 'transparent',
                  color: p === page ? '#fff' : 'var(--text-3)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
