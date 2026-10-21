'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { motion } from 'motion/react'
import type { CourtResponse } from '@/lib/api/courts'
import { createBooking, type BookingResponse } from '@/lib/api/bookings'
import { createPaymentIntent, confirmPayment, getPayment, type PaymentResponse } from '@/lib/api/payments'
import { ApiError } from '@/lib/api/client'
import { openWompiWidget, pollPayment } from '@/lib/payments/wompi'
import Sheet from '@/components/ui/Sheet'
import Button, { buttonClasses, Spinner } from '@/components/ui/Button'
import {
  IconCalendarPlus,
  IconCard,
  IconCheck,
  IconPin,
  IconShield,
  IconWhatsApp,
} from '@/components/app/icons'
import { formatCOP, formatDayLong, formatDuration, formatHour, hourOf } from '@/lib/format'
import { toLocalDateTime } from './availability'
import BookingTicket from './BookingTicket'
import { downloadIcs, mapsUrl, whatsappShareUrl } from './share'

export interface NewBookingSelection {
  court: CourtResponse
  date: string
  start: number
  end: number
}

type Step = 'review' | 'creating' | 'paying' | 'verifying' | 'done'

interface Props {
  open: boolean
  onClose: () => void
  venueName: string
  address: string
  /** Nueva reserva (crear + pagar en un paso)… */
  selection?: NewBookingSelection
  /** …o pago de una reserva pendiente existente. */
  booking?: BookingResponse
  pricePerHour?: number
  /** La reserva se creó (queda PENDING hasta pagar). */
  onBooked?: (b: BookingResponse) => void
  /** Wompi aprobó el pago. */
  onPaid?: (b: BookingResponse) => void
  /** El horario ya no estaba libre (409): refrescar la grilla. */
  onConflict?: () => void
}

/**
 * Checkout en una sola hoja: resumen tipo ticket → crear reserva → widget de Wompi →
 * verificación → ticket compartible. Monta con `key` nuevo en cada apertura para reiniciar.
 */
export default function CheckoutSheet({
  open,
  onClose,
  venueName,
  address,
  selection,
  booking: existing,
  pricePerHour,
  onBooked,
  onPaid,
  onConflict,
}: Props) {
  const [step, setStep] = useState<Step>('review')
  const [booking, setBooking] = useState<BookingResponse | null>(existing ?? null)
  const [payment, setPayment] = useState<PaymentResponse | null>(null)
  const [error, setError] = useState<{ message: string; conflict?: boolean } | null>(null)
  const stopPolling = useRef<(() => void) | null>(null)

  useEffect(() => () => stopPolling.current?.(), [])

  const courtName = selection?.court.name ?? existing?.courtName ?? ''
  const date = selection?.date ?? existing?.startAt.slice(0, 10) ?? ''
  const start = selection?.start ?? (existing ? hourOf(existing.startAt) : 0)
  const end = selection?.end ?? (existing ? hourOf(existing.endAt) : 0)
  const hours = end - start
  const rate = selection?.court.pricePerHour ?? pricePerHour ?? null
  const total = rate != null ? rate * hours : null
  const busy = step === 'creating' || step === 'paying' || step === 'verifying'

  async function ensureBooking(): Promise<BookingResponse | null> {
    if (booking) return booking
    if (!selection) return null
    setStep('creating')
    try {
      const b = await createBooking({
        courtId: selection.court.id,
        startAt: toLocalDateTime(selection.date, selection.start),
        endAt: toLocalDateTime(selection.date, selection.end),
      })
      setBooking(b)
      onBooked?.(b)
      return b
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError({
          message: 'Alguien acaba de reservar ese horario. Elige otro, todavía hay cupos.',
          conflict: true,
        })
      } else if (err instanceof ApiError && err.status === 400) {
        setError({ message: err.message || 'Revisa la fecha y el horario.' })
      } else {
        setError({ message: 'No se pudo crear la reserva. Revisa tu conexión e intenta de nuevo.' })
      }
      setStep('review')
      return null
    }
  }

  async function handlePay() {
    setError(null)
    const b = await ensureBooking()
    if (!b) return
    setStep('paying')
    try {
      const intent = await createPaymentIntent(b.id)
      await openWompiWidget(intent, async (transactionId) => {
        setStep('verifying')
        try {
          await confirmPayment(b.id, transactionId)
        } catch {
          // el sondeo igual detecta el cambio de estado
        }
        stopPolling.current = pollPayment(b.id, (p) => {
          setPayment(p)
          setStep('done')
          if (p.status === 'APPROVED') {
            const paid = { ...b, status: 'CONFIRMED' as const }
            setBooking(paid)
            onPaid?.(paid)
          }
        })
      })
    } catch {
      // El backend rechaza iniciar un pago que ya está en estado final
      try {
        const p = await getPayment(b.id)
        if (p.status === 'APPROVED') {
          setPayment(p)
          setBooking({ ...b, status: 'CONFIRMED' })
          setStep('done')
          return
        }
      } catch {
        // sin pagos previos
      }
      setError({
        message:
          'Tu reserva quedó apartada como pendiente, pero no pudimos abrir el pago. Puedes pagar desde Mis reservas.',
      })
      setStep('done')
    }
  }

  async function handlePayLater() {
    setError(null)
    const b = await ensureBooking()
    if (b) setStep('done')
  }

  // ─── Pantallas ──────────────────────────────────────────────────────────────

  const review = (
    <div className="flex flex-col gap-4 px-5 pt-3 pb-5 sm:px-6">
      <div className="relative overflow-hidden rounded-[20px] border border-line-2 bg-surface-2">
        <div className="pointer-events-none absolute -top-20 -right-10 size-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative p-5">
          <div className="text-overline text-fg-2">{venueName}</div>
          <div className="text-display mt-2 text-[32px] text-fg">{courtName}</div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[14px] font-medium text-fg first-letter:uppercase">
                {formatDayLong(date)}
              </div>
              <div className="num mt-1 text-[24px] leading-none font-semibold text-fg">
                {formatHour(start)}
                <span className="text-fg-3"> – </span>
                {formatHour(end)}
              </div>
            </div>
            <span className="rounded-full border border-line-2 px-3 py-1 text-[12.5px] font-medium text-fg-2">
              {formatDuration(hours)}
            </span>
          </div>
        </div>
        <div className="relative border-t border-dashed border-line-2 px-5 py-4">
          <dl className="grid gap-2 text-[14px]">
            {rate != null && (
              <div className="flex justify-between text-fg-2">
                <dt>
                  {formatCOP(rate)} × {formatDuration(hours)}
                </dt>
                <dd className="num">{formatCOP(rate * hours)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <dt className="font-semibold text-fg">Total</dt>
              <dd className="num text-[22px] font-semibold text-fg">
                {total != null ? formatCOP(total) : '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-[16px] border border-line bg-bg-2 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
          <IconShield className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-fg">Pago seguro con Wompi</div>
          <div className="mt-0.5 text-[13px] text-fg-2">Nequi · PSE · Tarjeta · Bancolombia</div>
        </div>
      </div>

      <p className="text-[12.5px] leading-relaxed text-fg-3">
        Si no puedes ir, cancela la reserva desde <span className="text-fg-2">Mis reservas</span>.
      </p>

      {error && (
        <div
          role="alert"
          className="rounded-[14px] border border-danger/30 bg-danger-soft px-4 py-3 text-[13.5px] text-danger"
        >
          {error.message}
          {error.conflict && onConflict && (
            <button
              onClick={() => {
                onConflict()
                onClose()
              }}
              className="mt-2 block font-semibold underline underline-offset-2 cursor-pointer"
            >
              Ver otros horarios
            </button>
          )}
        </div>
      )}
    </div>
  )

  const waiting = (
    <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-accent-soft text-accent-text">
        <Spinner className="size-7 border-[3px]" />
      </span>
      <div>
        <div className="text-[17px] font-semibold text-fg">
          {step === 'creating' && 'Apartando tu cancha…'}
          {step === 'paying' && 'Completa el pago en Wompi'}
          {step === 'verifying' && 'Verificando el pago'}
        </div>
        <p className="mx-auto mt-1 max-w-xs text-[13.5px] text-fg-2">
          {step === 'creating' && 'Un segundo, estamos confirmando que el horario sigue libre.'}
          {step === 'paying' && 'Se abrió la ventana segura de pago. No cierres esta pantalla.'}
          {step === 'verifying' && 'Esto puede tomar unos segundos.'}
        </p>
      </div>
      {step === 'paying' && (
        <button
          onClick={() => setStep('review')}
          className="text-[13px] font-medium text-fg-2 underline underline-offset-2 hover:text-fg cursor-pointer"
        >
          ¿Cerraste la ventana de pago? Volver
        </button>
      )}
    </div>
  )

  const paid = payment?.status === 'APPROVED' || booking?.status === 'CONFIRMED'
  const failed =
    payment && (payment.status === 'DECLINED' || payment.status === 'ERROR' || payment.status === 'VOIDED')

  const done = booking && (
    <div className="flex flex-col gap-5 px-5 pt-2 pb-5 sm:px-6">
      <div className="flex items-center gap-3">
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          className={clsx(
            'grid size-12 shrink-0 place-items-center rounded-full',
            paid
              ? 'bg-accent text-accent-ink'
              : failed
                ? 'bg-danger-soft text-danger'
                : 'bg-warning-soft text-warning'
          )}
        >
          {failed ? <span className="text-[20px] font-bold">!</span> : <IconCheck className="size-6" />}
        </motion.span>
        <div className="min-w-0">
          <div className="text-display text-[28px] text-fg">
            {paid ? '¡Reserva confirmada!' : failed ? 'Pago no aprobado' : 'Cancha apartada'}
          </div>
          <p className="mt-1 text-[13.5px] text-fg-2">
            {paid
              ? 'Ya está pagada. Invita a tu equipo.'
              : failed
                ? 'La reserva sigue pendiente. Puedes intentar pagar de nuevo desde Mis reservas.'
                : 'Queda pendiente de pago. Págala desde Mis reservas para confirmarla.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-[14px] border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] text-warning">
          {error.message}
        </div>
      )}

      <BookingTicket booking={booking} venueName={venueName} total={total} cutout="surface" />

      <div className="grid grid-cols-2 gap-2">
        <a
          href={whatsappShareUrl(booking, venueName)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('secondary', 'md', 'col-span-2 gap-2')}
        >
          <IconWhatsApp className="size-[18px] text-[#25D366]" />
          Compartir por WhatsApp
        </a>
        <Button variant="secondary" onClick={() => downloadIcs(booking, venueName, address)}>
          <IconCalendarPlus className="size-[17px]" />
          Calendario
        </Button>
        <a
          href={mapsUrl(`${venueName} ${address}`)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('secondary', 'md')}
        >
          <IconPin className="size-[17px]" />
          Cómo llegar
        </a>
      </div>
    </div>
  )

  let footer: React.ReactNode = null
  if (step === 'review') {
    footer = (
      <div className="flex flex-col gap-2">
        <Button size="lg" block onClick={handlePay}>
          <IconCard className="size-[18px]" />
          {booking ? 'Pagar' : 'Reservar y pagar'} {total != null ? formatCOP(total) : ''}
        </Button>
        {!booking && (
          <Button variant="ghost" block onClick={handlePayLater}>
            Apartar y pagar después
          </Button>
        )}
      </div>
    )
  } else if (step === 'done') {
    footer = (
      <Link href="/reservas" onClick={onClose} className={buttonClasses('primary', 'lg', 'w-full')}>
        Ver mis reservas
      </Link>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={
        step === 'review'
          ? booking
            ? 'Pagar reserva'
            : 'Confirma tu reserva'
          : step === 'done'
            ? ' '
            : undefined
      }
      description={step === 'review' ? 'Revisa los datos antes de pagar.' : undefined}
      footer={footer}
    >
      {step === 'review' && review}
      {busy && waiting}
      {step === 'done' && done}
    </Sheet>
  )
}
