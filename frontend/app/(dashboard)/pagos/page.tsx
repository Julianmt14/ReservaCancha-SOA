import PagosView from '@/components/app/pagos/PagosView'

export const metadata = { title: 'Pagos · ReservaCancha' }

export default function PagosPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
            Pagos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Consulta y gestiona todos los cobros del complejo.
          </p>
        </div>
      </div>

      <PagosView />
    </div>
  )
}
