import StatsGrid from '@/components/app/dashboard/StatsGrid'
import { IconPagos, IconStatIngresos, IconStatNoShows, IconStatReservas } from '@/components/app/icons'
import type { BusinessPaymentResponse } from '@/lib/api/payments'
import type { StatItem } from '@/lib/types/dashboard'

function fmt(cents: number) {
  return '$' + Math.round(cents / 100).toLocaleString('es-CO')
}

interface Props {
  rows: BusinessPaymentResponse[]
  loading: boolean
}

export default function PagosStats({ rows, loading }: Props) {
  const approved = rows.filter((r) => r.paymentStatus === 'APPROVED')
  const pending = rows.filter((r) => r.paymentStatus === 'PENDING')
  const declined = rows.filter(
    (r) => r.paymentStatus === 'DECLINED' || r.paymentStatus === 'ERROR' || r.paymentStatus === 'VOIDED'
  )

  const totalCobrado = approved.reduce((s, r) => s + r.amountInCents, 0)
  const totalPendiente = pending.reduce((s, r) => s + r.amountInCents, 0)

  const sk = loading ? '—' : undefined

  const stats: StatItem[] = [
    {
      id: 'cobrado',
      label: 'Total cobrado',
      value: sk ?? fmt(totalCobrado),
      deltaDir: 'up',
      deltaLabel: sk ?? `${approved.length} aprobados`,
      subLabel: 'vía Wompi',
      iconVariant: 'green',
      icon: <IconStatIngresos />,
      sparkline: {
        points: '0,28 14,20 28,24 42,12 56,16 70,6 84,10',
        color: 'var(--green)',
        fill: 'var(--green-soft)',
      },
    },
    {
      id: 'pendiente',
      label: 'Por cobrar',
      value: sk ?? fmt(totalPendiente),
      deltaDir: pending.length > 3 ? 'down' : 'neutral',
      deltaLabel: sk ?? `${pending.length} pendientes`,
      subLabel: 'sin confirmar',
      iconVariant: 'amber',
      icon: <IconPagos />,
    },
    {
      id: 'rechazados',
      label: 'Rechazados / Error',
      value: sk ?? String(declined.length),
      deltaDir: declined.length > 0 ? 'down' : 'neutral',
      deltaLabel: sk ?? (declined.length === 0 ? 'Sin problemas' : `${declined.length} fallidos`),
      subLabel: 'declined · error · void',
      iconVariant: 'red',
      icon: <IconStatNoShows />,
    },
    {
      id: 'transacciones',
      label: 'Transacciones',
      value: sk ?? rows.length,
      deltaDir: 'up',
      deltaLabel: sk ?? `${approved.length} exitosas`,
      subLabel: 'en total',
      iconVariant: 'blue',
      icon: <IconStatReservas />,
      sparkline: {
        points: '0,30 14,22 28,26 42,10 56,14 70,4 84,8',
        color: 'var(--blue)',
        fill: 'var(--blue-soft)',
      },
    },
  ]

  return <StatsGrid stats={stats} />
}
