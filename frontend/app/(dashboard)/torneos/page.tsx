import TorneosView from '@/components/app/torneos/TorneosView'
import { IconPlus } from '@/components/app/icons'

export const metadata = { title: 'Torneos · ReservaCancha' }

export default function TorneosPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
            Torneos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Organiza y gestiona torneos y ligas del complejo.
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{
            background: 'var(--green)',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          <IconPlus />
          Nuevo torneo
        </button>
      </div>

      <TorneosView torneos={[]} />
    </div>
  )
}
