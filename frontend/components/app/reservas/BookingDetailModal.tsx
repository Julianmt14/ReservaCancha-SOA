'use client'

import { useEffect, useState } from 'react'
import type { BookingResponse } from '@/lib/api/bookings'
import type { PaymentResponse } from '@/lib/api/payments'
import { useRouter } from 'next/navigation'
import { IconClose } from '@/components/app/icons'
import WompiCheckoutModal from '@/components/app/pagos/WompiCheckoutModal'
import { useAuth } from '@/lib/auth/context'

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: 'var(--amber)', bg: 'rgba(242,181,68,0.14)', label: 'Pendiente' },
  CONFIRMED: { color: 'var(--blue)', bg: 'rgba(76,141,245,0.14)', label: 'Confirmada' },
  COMPLETED: { color: 'var(--green)', bg: 'rgba(27,158,75,0.14)', label: 'Completada' },
  CANCELLED: { color: 'var(--red)', bg: 'rgba(229,72,77,0.14)', label: 'Cancelada' },
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-CO')
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface Props {
  open: boolean
  onClose: () => void
  booking: BookingResponse | null
  pricePerHour?: number
  ownerName?: string
  courtLoading?: boolean
  showGoToCourt?: boolean
  onGoToSchedule?: () => void
}

export default function BookingDetailModal({
  open,
  onClose,
  booking,
  pricePerHour,
  ownerName,
  courtLoading,
  showGoToCourt,
  onGoToSchedule,
}: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const [payOpen, setPayOpen] = useState(false)
  const [paidBooking, setPaidBooking] = useState<BookingResponse | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !payOpen) onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, payOpen])

  if (!open || !booking) return null

  const displayBooking = paidBooking ?? booking
  const isPending = displayBooking.status === 'PENDING' && user?.role === 'JUGADOR'

  function handlePaymentDone(payment: PaymentResponse) {
    if (payment.status === 'APPROVED') {
      setPaidBooking({ ...displayBooking, status: 'CONFIRMED' })
    }
  }

  const startH =
    new Date(displayBooking.startAt).getHours() + new Date(displayBooking.startAt).getMinutes() / 60
  const endH = new Date(displayBooking.endAt).getHours() + new Date(displayBooking.endAt).getMinutes() / 60
  const hours = endH - startH
  const total = pricePerHour != null ? pricePerHour * hours : null
  const st = STATUS_STYLE[displayBooking.status] ?? STATUS_STYLE.PENDING
  const initials = displayBooking.courtName.slice(0, 2).toUpperCase()

  function goToCourt() {
    sessionStorage.setItem('openCourtId', String(displayBooking.courtId))
    sessionStorage.setItem('openCourtWeekDate', displayBooking.startAt)
    router.push('/')
    onClose()
  }

  const goToScheduleAction = onGoToSchedule ?? (showGoToCourt ? goToCourt : undefined)

  const Sk = ({ w = 32 }: { w?: number }) => (
    <div
      className="h-3 rounded animate-pulse"
      style={{ background: 'var(--panel-2)', width: `${w * 4}px` }}
    />
  )

  const rows = [
    {
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      label: 'Fecha',
      value: formatDate(booking.startAt),
      mono: false,
    },
    {
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      label: 'Horario',
      value: `${formatTime(booking.startAt)} – ${formatTime(booking.endAt)} · ${hours}h`,
      mono: false,
    },
    {
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      label: 'Costo total',
      value: total != null ? `${fmt(total)} COP` : '—',
      mono: false,
    },
    {
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      ),
      label: 'Precio por hora',
      value: pricePerHour != null ? `${fmt(pricePerHour)} COP` : '—',
      mono: false,
    },
    {
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
      label: 'Teléfono',
      value: displayBooking.playerPhone ?? '—',
      mono: true,
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {courtLoading ? (
          <>
            <div className="flex" style={{ minHeight: 200 }}>
              <div
                className="shrink-0 flex flex-col items-center justify-center gap-3"
                style={{
                  width: 180,
                  background: 'rgba(255,255,255,0.03)',
                  borderRight: '1px solid var(--line)',
                }}
              >
                <div className="size-16 rounded-2xl animate-pulse" style={{ background: 'var(--panel-2)' }} />
                <div className="h-3 w-12 rounded animate-pulse" style={{ background: 'var(--panel-2)' }} />
              </div>
              <div className="flex-1 flex flex-col justify-between px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <Sk w={20} />
                    <Sk w={36} />
                  </div>
                  <button
                    onClick={onClose}
                    className="size-8 rounded-lg grid place-items-center shrink-0 cursor-pointer"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <IconClose />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <div
                    className="h-6 w-20 rounded-full animate-pulse"
                    style={{ background: 'var(--panel-2)' }}
                  />
                  <Sk w={24} />
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--line)' }} />
            <div className="px-6 py-5 flex flex-col gap-0">
              {[40, 52, 28, 32, 24].map((w, i, arr) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}
                >
                  <div
                    className="size-3.5 rounded animate-pulse shrink-0"
                    style={{ background: 'var(--panel-2)' }}
                  />
                  <div
                    className="h-3 w-28 rounded animate-pulse shrink-0"
                    style={{ background: 'var(--panel-2)' }}
                  />
                  <Sk w={w} />
                </div>
              ))}
            </div>
            <div className="px-6 pb-5">
              <div className="h-10 rounded-xl animate-pulse" style={{ background: 'var(--panel-2)' }} />
            </div>
          </>
        ) : (
          <>
            <div className="flex" style={{ minHeight: 200 }}>
              <div
                className="shrink-0 flex flex-col items-center justify-center gap-2"
                style={{
                  width: 180,
                  background: 'rgba(27,158,75,0.12)',
                  borderRight: '1px solid var(--line)',
                }}
              >
                <div
                  className="size-16 rounded-2xl grid place-items-center text-[22px] font-bold"
                  style={{
                    background: 'rgba(27,158,75,0.2)',
                    color: 'var(--green)',
                    border: '1px solid rgba(27,158,75,0.35)',
                  }}
                >
                  {initials}
                </div>
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(27,158,75,0.15)', color: 'var(--green)' }}
                >
                  Cancha
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-between px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {ownerName && (
                      <p
                        className="text-[11px] uppercase tracking-widest font-semibold mb-1"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {ownerName}
                      </p>
                    )}
                    <h2
                      className="text-[20px] font-bold tracking-[-0.02em] leading-tight"
                      style={{ color: 'var(--text)' }}
                    >
                      {displayBooking.courtName}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="size-8 rounded-lg grid place-items-center shrink-0 cursor-pointer mt-0.5"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <IconClose />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <span
                    className="text-[11.5px] font-semibold px-3 py-1 rounded-full"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                  <span
                    className="font-mono text-[12px] font-semibold px-2.5 py-1 rounded-lg"
                    style={{
                      background: 'var(--bg-2)',
                      color: 'var(--text-2)',
                      border: '1px solid var(--line-2)',
                    }}
                  >
                    #{displayBooking.bookingCode}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--line)' }} />

            <div className="px-6 py-5 flex flex-col gap-0">
              {rows.map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-center gap-4 py-3"
                  style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none' }}
                >
                  <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{row.icon}</span>
                  <span className="text-[12px] w-28 shrink-0" style={{ color: 'var(--text-3)' }}>
                    {row.label}
                  </span>
                  <span
                    className={`text-[13px] font-medium capitalize${row.mono ? ' font-mono tracking-wide' : ''}`}
                    style={{ color: 'var(--text)' }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 pb-5 flex gap-2">
              {isPending && (
                <button
                  onClick={() => setPayOpen(true)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
                  style={{ background: 'var(--green)', color: '#fff' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--green-deep)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--green)')}
                >
                  Pagar reserva
                </button>
              )}
              {goToScheduleAction && (
                <button
                  onClick={goToScheduleAction}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
                  style={{
                    background: isPending ? 'var(--bg-2)' : 'var(--green)',
                    color: isPending ? 'var(--text-2)' : '#fff',
                    border: isPending ? '1px solid var(--line)' : 'none',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = isPending ? 'var(--panel-2)' : 'var(--green-deep)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isPending ? 'var(--bg-2)' : 'var(--green)')
                  }
                >
                  Ver horario de la cancha
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
                style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--line)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>

      <WompiCheckoutModal
        open={payOpen}
        bookingId={displayBooking.id}
        bookingCode={displayBooking.bookingCode}
        onClose={() => setPayOpen(false)}
        onPaymentDone={handlePaymentDone}
      />
    </div>
  )
}
