'use client'

import { useEffect, useRef, useState } from 'react'
import type { PaymentIntentResponse, PaymentResponse } from '@/lib/api/payments'
import { createPaymentIntent, getPayment, confirmPayment } from '@/lib/api/payments'
import { IconClose } from '@/components/app/icons'

// Wompi widget type declaration
declare global {
  interface Window {
    WidgetCheckout?: new (config: Record<string, unknown>) => {
      open: (callback: (result: { transaction: { id: string; status: string } }) => void) => void
    }
  }
}

const WOMPI_SCRIPT_URL = 'https://checkout.wompi.co/widget.js'
const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 20

type Step = 'loading-intent' | 'ready' | 'opening-widget' | 'polling' | 'done' | 'error'

const STATUS_CONFIG = {
  APPROVED: { color: 'var(--green)', bg: 'rgba(27,158,75,0.14)', label: 'Pago aprobado', icon: '✓' },
  DECLINED: { color: 'var(--red)', bg: 'rgba(229,72,77,0.14)', label: 'Pago rechazado', icon: '✕' },
  VOIDED: { color: 'var(--red)', bg: 'rgba(229,72,77,0.14)', label: 'Pago anulado', icon: '✕' },
  ERROR: { color: 'var(--red)', bg: 'rgba(229,72,77,0.14)', label: 'Error en pago', icon: '!' },
  PENDING: { color: 'var(--amber)', bg: 'rgba(242,181,68,0.14)', label: 'Pago pendiente', icon: '…' },
}

function fmt(cents: number) {
  return '$' + Math.round(cents / 100).toLocaleString('es-CO')
}

function loadWompiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.WidgetCheckout) {
      resolve()
      return
    }
    const existing = document.querySelector(`script[src="${WOMPI_SCRIPT_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Wompi script')))
      return
    }
    const script = document.createElement('script')
    script.src = WOMPI_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Wompi script'))
    document.head.appendChild(script)
  })
}

interface Props {
  open: boolean
  bookingId: number
  bookingCode: string
  onClose: () => void
  onPaymentDone: (payment: PaymentResponse) => void
}

export default function WompiCheckoutModal({ open, bookingId, bookingCode, onClose, onPaymentDone }: Props) {
  const [step, setStep] = useState<Step>('loading-intent')
  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null)
  const [payment, setPayment] = useState<PaymentResponse | null>(null)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)

  // Reset on open
  useEffect(() => {
    if (!open) return
    setStep('loading-intent')
    setIntent(null)
    setPayment(null)
    setError('')
    attemptsRef.current = 0

    createPaymentIntent(bookingId)
      .then((i) => {
        setIntent(i)
        setStep('ready')
      })
      .catch(async () => {
        // El backend lanza error solo si el pago ya está en estado final
        try {
          const existing = await getPayment(bookingId)
          setPayment(existing)
          setStep('done')
        } catch {
          setError('No se pudo iniciar el pago. Intenta de nuevo.')
          setStep('error')
        }
      })
  }, [open, bookingId])

  // Keyboard close
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'opening-widget' && step !== 'polling') onClose()
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, step, onClose])

  // Cleanup polling on unmount
  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current)
    },
    []
  )

  function startPolling() {
    attemptsRef.current = 0
    pollRef.current = setInterval(async () => {
      attemptsRef.current++
      try {
        const p = await getPayment(bookingId)
        if (p.status !== 'PENDING') {
          clearInterval(pollRef.current!)
          setPayment(p)
          setStep('done')
          onPaymentDone(p)
        } else if (attemptsRef.current >= POLL_MAX_ATTEMPTS) {
          clearInterval(pollRef.current!)
          setPayment(p)
          setStep('done')
        }
      } catch {
        // keep polling
      }
    }, POLL_INTERVAL_MS)
  }

  async function handleOpenWidget() {
    if (!intent) return
    setStep('opening-widget')
    try {
      await loadWompiScript()
      const checkout = new window.WidgetCheckout!({
        currency: intent.currency,
        amountInCents: intent.amountInCents,
        reference: intent.reference,
        publicKey: intent.publicKey,
        signature: { integrity: intent.integritySignature },
      })
      checkout.open(async (result) => {
        console.log('Wompi transaction:', result.transaction)
        setStep('polling')
        try {
          await confirmPayment(bookingId, result.transaction.id)
        } catch {
          // el polling igual detecta el cambio
        }
        startPolling()
      })
    } catch (err) {
      console.error(err)
      setError('No se pudo abrir el widget de pago.')
      setStep('error')
    }
  }

  if (!open) return null

  const statusCfg = payment ? (STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.PENDING) : null

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        if (step !== 'opening-widget' && step !== 'polling') onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div>
            <h2 className="text-[16px] font-bold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
              Pagar reserva
            </h2>
            <p className="text-[12px] font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>
              #{bookingCode}
            </p>
          </div>
          {step !== 'opening-widget' && step !== 'polling' && (
            <button
              onClick={onClose}
              className="size-8 rounded-lg grid place-items-center cursor-pointer"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <IconClose />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col gap-5">
          {/* loading intent */}
          {step === 'loading-intent' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div
                className="size-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }}
              />
              <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
                Preparando pago…
              </p>
            </div>
          )}

          {/* ready */}
          {step === 'ready' && intent && (
            <>
              <div
                className="rounded-xl px-5 py-4 flex items-center justify-between"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                <div>
                  <p
                    className="text-[11px] uppercase tracking-wide font-semibold"
                    style={{ color: 'var(--text-3)' }}
                  >
                    Total a pagar
                  </p>
                  <p
                    className="text-[28px] font-bold tracking-[-0.03em] mt-1"
                    style={{ color: 'var(--text)' }}
                  >
                    {fmt(intent.amountInCents)}{' '}
                    <span className="text-[14px] font-normal" style={{ color: 'var(--text-3)' }}>
                      COP
                    </span>
                  </p>
                </div>
                <div
                  className="size-12 rounded-xl grid place-items-center text-[20px]"
                  style={{ background: 'rgba(27,158,75,0.15)', color: 'var(--green)' }}
                >
                  $
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { label: 'Referencia', value: intent.reference, mono: true },
                  { label: 'Moneda', value: intent.currency, mono: false },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between py-2"
                    style={{ borderBottom: '1px solid var(--line)' }}
                  >
                    <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                      {r.label}
                    </span>
                    <span
                      className={`text-[12px] font-medium${r.mono ? ' font-mono' : ''}`}
                      style={{ color: 'var(--text)' }}
                    >
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11.5px] text-center" style={{ color: 'var(--text-3)' }}>
                Serás dirigido al widget seguro de Wompi para completar el pago.
              </p>

              <button
                onClick={handleOpenWidget}
                className="w-full py-3 rounded-xl text-[14px] font-semibold cursor-pointer"
                style={{ background: 'var(--green)', color: '#fff' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--green-deep)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--green)')}
              >
                Abrir widget de pago
              </button>
            </>
          )}

          {/* opening widget */}
          {step === 'opening-widget' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div
                className="size-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--blue)', borderTopColor: 'transparent' }}
              />
              <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
                Abriendo widget de Wompi…
              </p>
            </div>
          )}

          {/* polling */}
          {step === 'polling' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div
                className="size-12 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--amber)', borderTopColor: 'transparent' }}
              />
              <div className="text-center">
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                  Verificando pago
                </p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>
                  Esto puede tomar unos segundos…
                </p>
              </div>
            </div>
          )}

          {/* done */}
          {step === 'done' && payment && statusCfg && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="size-14 rounded-full grid place-items-center text-[24px] font-bold"
                style={{
                  background: statusCfg.bg,
                  color: statusCfg.color,
                  border: `1px solid ${statusCfg.color}`,
                }}
              >
                {statusCfg.icon}
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold" style={{ color: statusCfg.color }}>
                  {statusCfg.label}
                </p>
                {payment.wompiTransactionId && (
                  <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--text-3)' }}>
                    ID: {payment.wompiTransactionId}
                  </p>
                )}
              </div>
              {payment.status === 'APPROVED' && (
                <p className="text-[12.5px] text-center" style={{ color: 'var(--text-2)' }}>
                  Tu reserva ha sido confirmada. Recibirás la confirmación pronto.
                </p>
              )}
              {(payment.status === 'DECLINED' || payment.status === 'ERROR') && (
                <p className="text-[12.5px] text-center" style={{ color: 'var(--text-2)' }}>
                  No se procesó el pago. Puedes intentarlo de nuevo.
                </p>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer mt-2"
                style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--line)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
              >
                Cerrar
              </button>
            </div>
          )}

          {/* error */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="size-12 rounded-full grid place-items-center text-[20px]"
                style={{ background: 'rgba(229,72,77,0.14)', color: 'var(--red)' }}
              >
                !
              </div>
              <p className="text-[13px] text-center" style={{ color: 'var(--text-2)' }}>
                {error}
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
                style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--line)' }}
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
