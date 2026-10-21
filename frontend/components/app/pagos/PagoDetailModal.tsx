'use client'

import { useEffect } from 'react'
import type { BusinessPaymentResponse } from '@/lib/api/payments'
import { IconClose } from '@/components/app/icons'
import PagoStatusBadge from './PagoStatusBadge'

function fmt(cents: number) {
  return '$' + Math.round(cents / 100).toLocaleString('es-CO')
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) +
    ' · ' +
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

function methodLabel(method: string | null) {
  if (!method) return '—'
  if (method.toUpperCase().includes('CARD')) return 'Tarjeta'
  if (method.toUpperCase().includes('NEQUI')) return 'Nequi'
  if (method.toUpperCase().includes('PSE')) return 'PSE'
  if (method.toUpperCase().includes('CASH')) return 'Efectivo'
  return method
}

interface Props {
  payment: BusinessPaymentResponse | null
  onClose: () => void
}

export default function PagoDetailModal({ payment, onClose }: Props) {
  useEffect(() => {
    if (!payment) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [payment, onClose])

  if (!payment) return null

  const hours = (new Date(payment.endAt).getTime() - new Date(payment.startAt).getTime()) / 3_600_000

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
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      label: 'Fecha reserva',
      value: formatDateTime(payment.startAt),
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
      value: `${formatTime(payment.startAt)} – ${formatTime(payment.endAt)} · ${hours}h`,
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
      value: payment.playerPhone || '—',
      mono: true,
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
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
      label: 'Método de pago',
      value: methodLabel(payment.paymentMethod),
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
      label: 'Monto',
      value: `${fmt(payment.amountInCents)} ${payment.currency}`,
      mono: true,
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
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
      label: 'Referencia Wompi',
      value: payment.wompiReference || '—',
      mono: true,
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
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      label: 'Fecha de pago',
      value: formatDateTime(payment.paymentCreatedAt),
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
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex" style={{ minHeight: 160 }}>
          <div
            className="shrink-0 flex flex-col items-center justify-center gap-2"
            style={{ width: 160, background: 'rgba(76,141,245,0.10)', borderRight: '1px solid var(--line)' }}
          >
            <div
              className="size-14 rounded-2xl grid place-items-center text-[20px] font-bold"
              style={{
                background: 'rgba(76,141,245,0.18)',
                color: 'var(--blue)',
                border: '1px solid rgba(76,141,245,0.3)',
              }}
            >
              {payment.courtName.slice(0, 2).toUpperCase()}
            </div>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(76,141,245,0.15)', color: 'var(--blue)' }}
            >
              Pago
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-between px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-[11px] uppercase tracking-widest font-semibold mb-1"
                  style={{ color: 'var(--text-3)' }}
                >
                  {payment.courtName}
                </p>
                <h2
                  className="text-[18px] font-bold tracking-[-0.02em] leading-tight"
                  style={{ color: 'var(--text)' }}
                >
                  {payment.playerName}
                </h2>
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
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <PagoStatusBadge status={payment.paymentStatus} />
              <span
                className="font-mono text-[12px] font-semibold px-2.5 py-1 rounded-lg"
                style={{
                  background: 'var(--bg-2)',
                  color: 'var(--text-2)',
                  border: '1px solid var(--line-2)',
                }}
              >
                #{payment.bookingCode}
              </span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--line)' }} />

        {/* Rows */}
        <div className="px-5 py-4 flex flex-col gap-0">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className="flex items-center gap-4 py-2.5"
              style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none' }}
            >
              <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{row.icon}</span>
              <span className="text-[12px] w-36 shrink-0" style={{ color: 'var(--text-3)' }}>
                {row.label}
              </span>
              <span
                className={`text-[12px] font-medium${row.mono ? ' font-mono' : ''}`}
                style={{ color: 'var(--text)' }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 pt-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
            style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--line)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
