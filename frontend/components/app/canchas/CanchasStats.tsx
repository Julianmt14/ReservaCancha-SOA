import StatsGrid from '@/components/app/dashboard/StatsGrid'
import { IconCanchas, IconStatReservas, IconStatIngresos, IconStatOcupacion } from '@/components/app/icons'
import type { StatItem } from '@/lib/types/dashboard'
import type { CourtWithData } from './CanchasView'

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CO')
}

function localIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekStart(ref: Date) {
  const d = new Date(ref)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export default function CanchasStats({ courtsData }: { courtsData: CourtWithData[] }) {
  const now = new Date()
  const weekStart = getWeekStart(now)
  const weekEnd = addDays(weekStart, 6)
  const weekStartStr = localIsoDate(weekStart)
  const weekEndStr = localIsoDate(weekEnd)
  const monthStart = localIsoDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = localIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))

  const activas = courtsData.filter((d) => d.court.active).length
  const total = courtsData.length

  const weekBookings = courtsData.flatMap(({ bookings }) =>
    bookings.filter((b) => {
      const d = localIsoDate(new Date(b.startAt))
      return d >= weekStartStr && d <= weekEndStr && b.status !== 'CANCELLED'
    })
  )

  const monthIngresos = courtsData.reduce((acc, { court, bookings }) => {
    const inMonth = bookings.filter((b) => {
      const d = localIsoDate(new Date(b.startAt))
      return d >= monthStart && d <= monthEnd && b.status !== 'CANCELLED'
    })
    return (
      acc +
      inMonth.reduce((s, b) => {
        const h = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3600000
        return s + court.pricePerHour * h
      }, 0)
    )
  }, 0)

  // Ocupación semanal promedio: horas reservadas / horas disponibles por cancha
  const avgOccupancy = (() => {
    if (!courtsData.length) return 0
    const pcts = courtsData.map(({ bookings, schedules }) => {
      const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      let availableH = 0
      let bookedH = 0
      for (const day of days) {
        const dow = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][
          day.getDay()
        ]
        const sched = schedules.find((s) => s.dayOfWeek === dow && s.active)
        if (!sched) continue
        const [oh, om] = sched.openingTime.split(':').map(Number)
        const [ch, cm] = sched.closingTime.split(':').map(Number)
        const open = oh + om / 60
        const close = ch === 23 && cm === 59 ? 24 : ch + cm / 60
        availableH += close - open
        const dateStr = localIsoDate(day)
        bookings
          .filter((b) => localIsoDate(new Date(b.startAt)) === dateStr && b.status !== 'CANCELLED')
          .forEach((b) => {
            const h = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3600000
            bookedH += h
          })
      }
      return availableH > 0 ? Math.min(100, Math.round((bookedH / availableH) * 100)) : 0
    })
    return Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length)
  })()

  const stats: StatItem[] = [
    {
      id: 'canchas',
      label: 'Canchas activas',
      value: `${activas} / ${total}`,
      deltaDir: activas === total ? 'up' : 'down',
      deltaLabel: activas === total ? 'todas operativas' : `${total - activas} fuera`,
      subLabel: 'en el complejo',
      iconVariant: 'green',
      icon: <IconCanchas />,
    },
    {
      id: 'reservas',
      label: 'Reservas esta semana',
      value: weekBookings.length,
      deltaDir: 'up',
      deltaLabel: `${weekBookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length} confirmadas`,
      subLabel: 'entre todas las canchas',
      iconVariant: 'blue',
      icon: <IconStatReservas />,
    },
    {
      id: 'ocupacion',
      label: 'Ocupación semanal',
      value: `${avgOccupancy}%`,
      deltaDir: 'up',
      deltaLabel: '',
      subLabel: 'promedio del complejo',
      iconVariant: 'amber',
      icon: <IconStatOcupacion />,
      ring: { pct: avgOccupancy },
    },
    {
      id: 'ingresos',
      label: 'Ingresos del mes',
      value: fmt(monthIngresos),
      deltaDir: 'up',
      deltaLabel: '',
      subLabel: 'estimado sin pagos',
      iconVariant: 'blue',
      icon: <IconStatIngresos />,
    },
  ]

  return <StatsGrid stats={stats} />
}
