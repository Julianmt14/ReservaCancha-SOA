import type { StatItem, IconVariant } from '@/lib/types/dashboard'

export type { StatItem }

const iconBg: Record<IconVariant, string> = {
  green: 'bg-brand-soft',
  blue: 'bg-blue-soft',
  amber: 'bg-amber-soft',
  red: 'bg-red-soft',
}
const iconColor: Record<IconVariant, string> = {
  green: 'text-brand',
  blue: 'text-blue',
  amber: 'text-amber',
  red: 'text-red',
}

function Sparkline({ points, color, fill }: { points: string; color: string; fill: string }) {
  return (
    <svg
      className="absolute right-4 top-[18px] w-[84px] h-8 opacity-85"
      viewBox="0 0 84 32"
      preserveAspectRatio="none"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <polyline points={`${points} 84,32 0,32`} fill={fill} stroke="none" />
    </svg>
  )
}

function Ring({ pct }: { pct: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <svg
      className="absolute right-[18px] top-1/2 -translate-y-1/2"
      width="56"
      height="56"
      viewBox="0 0 56 56"
    >
      <circle cx="28" cy="28" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
      <circle
        cx="28"
        cy="28"
        r={r}
        stroke="var(--amber)"
        strokeWidth="6"
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
    </svg>
  )
}

function StatCard({ stat }: { stat: StatItem }) {
  return (
    <div className="relative rounded-[14px] px-5 py-[18px] overflow-hidden bg-panel border border-line">
      <div className="flex items-center gap-2 text-[12.5px] font-medium uppercase tracking-[0.06em] text-text-2">
        <span
          className={`size-6 rounded-[6px] grid place-items-center shrink-0 ${iconBg[stat.iconVariant]} ${iconColor[stat.iconVariant]}`}
        >
          <span className="size-[14px] block">{stat.icon}</span>
        </span>
        {stat.label}
      </div>
      <div className="mt-[14px] text-[34px] font-bold tracking-[-0.035em] text-text">{stat.value}</div>
      <div className="mt-[6px] flex items-center gap-2 text-[12.5px] text-text-3">
        <span
          className={`inline-flex items-center gap-[3px] font-semibold font-mono ${stat.deltaDir === 'up' ? 'text-brand' : stat.deltaDir === 'down' ? 'text-red' : 'text-text-3'}`}
        >
          {stat.deltaDir === 'up' ? '▲ ' : stat.deltaDir === 'down' ? '▼ ' : ''}
          {stat.deltaLabel}
        </span>
        {stat.subLabel}
      </div>
      {stat.sparkline && <Sparkline {...stat.sparkline} />}
      {stat.ring && <Ring {...stat.ring} />}
    </div>
  )
}

export default function StatsGrid({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  )
}
