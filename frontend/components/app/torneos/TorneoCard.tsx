import type { Torneo } from '@/lib/types/torneos'
import TorneoStatusBadge from './TorneoStatusBadge'

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const color = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--blue)' : 'var(--amber)'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-mono font-semibold w-12 text-right shrink-0" style={{ color }}>
        {value}/{max}
      </span>
    </div>
  )
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-CO')
}

export default function TorneoCard({ torneo }: { torneo: Torneo }) {
  return (
    <div
      className="rounded-[14px] p-5 flex flex-col gap-4"
      style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>
              {torneo.name}
            </span>
            <TorneoStatusBadge status={torneo.status} />
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {torneo.format} · {torneo.courts.join(', ')}
          </div>
        </div>
      </div>

      {/* Fechas */}
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
        style={{ background: 'var(--bg-2)' }}
      >
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>
            Inicio
          </div>
          <div className="font-mono font-semibold" style={{ color: 'var(--text)' }}>
            {formatDate(torneo.startDate)}
          </div>
        </div>
        <div className="text-[10px]" style={{ color: 'var(--line-2)' }}>
          →
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>
            Fin
          </div>
          <div className="font-mono font-semibold" style={{ color: 'var(--text)' }}>
            {formatDate(torneo.endDate)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>
            Inscripción
          </div>
          <div className="font-mono font-semibold" style={{ color: 'var(--green)' }}>
            {fmt(torneo.pricePerTeam)}
          </div>
        </div>
      </div>

      {/* Equipos */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10.5px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          Equipos inscritos
        </div>
        <ProgressBar value={torneo.registeredTeams} max={torneo.maxTeams} />
      </div>

      {/* Partidos */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10.5px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          Progreso de partidos
        </div>
        <ProgressBar value={torneo.matchesPlayed} max={torneo.matchesTotal} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--line)' }}>
        <div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
            Ingresos
          </div>
          <div className="text-[13px] font-bold font-mono" style={{ color: 'var(--green)' }}>
            {fmt(torneo.totalRevenue)}
          </div>
        </div>
        {torneo.champion && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
              Campeón
            </div>
            <div className="text-xs font-semibold" style={{ color: 'var(--amber)' }}>
              🏆 {torneo.champion}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
