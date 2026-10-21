import StatsGrid from '@/components/app/dashboard/StatsGrid'
import { IconTorneos, IconStatReservas, IconStatIngresos, IconStatOcupacion } from '@/components/app/icons'
import type { Torneo } from '@/lib/types/torneos'
import type { StatItem } from '@/lib/types/dashboard'

function fmt(n: number) {
  return '$' + n.toLocaleString('es-CO')
}

export default function TorneosStats({ torneos }: { torneos: Torneo[] }) {
  const activos = torneos.filter((t) => t.status === 'activo').length
  const totalRevenue = torneos.reduce((s, t) => s + t.totalRevenue, 0)
  const totalPartidos = torneos.reduce((s, t) => s + t.matchesPlayed, 0)
  const totalEquipos = torneos.filter((t) => t.status === 'activo').reduce((s, t) => s + t.registeredTeams, 0)

  const stats: StatItem[] = [
    {
      id: 'activos',
      label: 'Torneos activos',
      value: activos,
      deltaDir: 'up',
      deltaLabel: `${torneos.length} histórico`,
      subLabel: 'en este momento',
      iconVariant: 'green',
      icon: <IconTorneos />,
    },
    {
      id: 'equipos',
      label: 'Equipos inscritos',
      value: totalEquipos,
      deltaDir: 'up',
      deltaLabel: `${totalEquipos} activos`,
      subLabel: 'en torneos vigentes',
      iconVariant: 'blue',
      icon: <IconStatReservas />,
      sparkline: {
        points: '0,28 14,20 28,22 42,12 56,16 70,8 84,10',
        color: 'var(--blue)',
        fill: 'var(--blue-soft)',
      },
    },
    {
      id: 'partidos',
      label: 'Partidos jugados',
      value: totalPartidos,
      deltaDir: 'up',
      deltaLabel: `${totalPartidos} total`,
      subLabel: 'en todos los torneos',
      iconVariant: 'amber',
      icon: <IconStatOcupacion />,
      sparkline: {
        points: '0,30 14,24 28,20 42,14 56,18 70,8 84,12',
        color: 'var(--amber)',
        fill: 'var(--amber-soft)',
      },
    },
    {
      id: 'ingresos',
      label: 'Ingresos torneos',
      value: fmt(totalRevenue),
      deltaDir: 'up',
      deltaLabel: '+15.3%',
      subLabel: 'vs. período anterior',
      iconVariant: 'blue',
      icon: <IconStatIngresos />,
      sparkline: {
        points: '0,30 14,22 28,26 42,10 56,14 70,4 84,8',
        color: 'var(--blue)',
        fill: 'var(--blue-soft)',
      },
    },
  ]

  return <StatsGrid stats={stats} />
}
