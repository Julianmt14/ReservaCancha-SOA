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
import { formatCOP, formatDayLong, formatDuration, formatHour, hourOf, initials } from '@/lib/format'
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

const PAY_METHODS = [
  ['Nequi', 'Al instante'],
  ['PSE', 'Desde tu banco'],
  ['Tarjeta', 'Crédito o débito'],
  ['Bancolombia', 'Botón de pago'],
]

/**
 * Lo que respondió el servidor al intentar abrir el pago, tal cual. Si el servicio de pagos está
 * caído, el backend responde 503 con su propio mensaje y aquí se muestra sin reescribirlo.
 */
function payErrorDetail(err: unknown): string | null {
  if (err instanceof ApiError) return err.message || `Error ${err.status}`
  if (err instanceof TypeError) return 'No hay conexión con el servidor de ReservaCancha.'
  if (err instanceof Error) return err.message
  return null
}

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
  const [error, setError] = useState<{ message: string; detail?: string | null; conflict?: boolean } | null>(
    null
  )
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
    } catch (err) {
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
        detail: payErrorDetail(err),
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
      <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] bg-accent-soft p-3.5">
        <span className="grid size-[52px] place-items-center rounded-[14px] bg-botella text-[17px] font-extrabold text-white">
          {initials(courtName)}
        </span>
        <div className="min-w-0">
          <b className="block truncate font-extrabold text-fg">
            {venueName} · {courtName}
          </b>
          <small className="num block text-[13.5px] text-fg-2 first-letter:uppercase">
            {formatDayLong(date)} · {formatHour(start)}–{formatHour(end)} · {formatDuration(hours)}
          </small>
        </div>
        <strong className="num text-[18px] font-extrabold text-accent-text">
          {total != null ? formatCOP(total) : '—'}
        </strong>
      </div>

      {rate != null && (
        <dl className="grid gap-1.5 px-1 text-[14.5px]">
          <div className="flex justify-between text-fg-2">
            <dt>
              {formatCOP(rate)} la hora × {formatDuration(hours)}
            </dt>
            <dd className="num">{formatCOP(rate * hours)}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="font-bold text-fg">Total a pagar</dt>
            <dd className="num text-[20px] font-extrabold text-fg">{formatCOP(rate * hours)}</dd>
          </div>
        </dl>
      )}

      <div>
        <div className="flex items-center gap-2 text-[14px] font-bold text-fg-2">
          <IconShield className="size-4 text-accent-text" />
          Pagas en la ventana segura de Wompi con
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PAY_METHODS.map(([name, hint]) => (
            <div
              key={name}
              className="rounded-[12px] border-[1.5px] border-line px-3 py-2.5 font-bold text-fg"
            >
              {name}
              <small className="block text-[12.5px] font-medium text-fg-2">{hint}</small>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[13px] text-fg-2">
        Si no puedes ir, cancela la reserva desde <b className="font-bold">Mis reservas</b>.
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
    <div className="flex flex-col gap-4 px-5 pt-2 pb-5 text-center sm:px-6">
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        className={clsx(
          'mx-auto mt-1 grid size-16 place-items-center rounded-full',
          paid
            ? 'bg-accent-soft text-accent-text'
            : failed
              ? 'bg-danger-soft text-danger'
              : 'bg-warning-soft text-warning'
        )}
      >
        {failed ? <span className="text-[24px] font-extrabold">!</span> : <IconCheck className="size-7" />}
      </motion.span>
      <div>
        <h3 className="text-[28px] font-extrabold tracking-[-0.025em] text-fg">
          {paid ? '¡Tu turno está listo!' : failed ? 'Pago no aprobado' : 'Cancha apartada'}
        </h3>
        <p className="mx-auto mt-1.5 max-w-sm leading-relaxed text-fg-2">
          {paid
            ? 'Ya está pagada. Muestra este código al llegar e invita a tu equipo.'
            : failed
              ? 'La reserva sigue pendiente. Puedes intentar pagar de nuevo desde Mis reservas.'
              : 'Queda pendiente de pago. Págala desde Mis reservas para confirmarla.'}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[14px] border border-warning/30 bg-warning-soft px-4 py-3 text-left text-[13.5px] text-warning"
        >
          {error.message}
          {error.detail && (
            <span className="mt-2 block border-t border-warning/25 pt-2 font-bold text-fg">
              <span className="block text-[11.5px] font-bold tracking-[0.08em] text-fg-2 uppercase">
                Respuesta del servidor
              </span>
              {error.detail}
            </span>
          )}
        </div>
      )}

      <BookingTicket booking={booking} venueName={venueName} total={total} />

      <div className="grid grid-cols-2 gap-2">
        <a
          href={whatsappShareUrl(booking, venueName)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('secondary', 'md', 'col-span-2 gap-2 font-bold')}
        >
          <IconWhatsApp className="size-[18px] text-[#25D366]" />
          Compartir por WhatsApp
        </a>
        <Button
          variant="secondary"
          className="font-bold"
          onClick={() => downloadIcs(booking, venueName, address)}
        >
          <IconCalendarPlus className="size-[17px]" />
          Calendario
        </Button>
        <a
          href={mapsUrl(`${venueName} ${address}`)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('secondary', 'md', 'font-bold')}
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
        <Button size="lg" block onClick={handlePay} className="rounded-full font-extrabold">
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
      <Link
        href="/reservas"
        onClick={onClose}
        className={buttonClasses('primary', 'lg', 'w-full rounded-full font-extrabold')}
      >
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
      width="sm:max-w-[480px]"
      footer={footer}
    >
      {step === 'review' && review}
      {busy && waiting}
      {step === 'done' && done}
    </Sheet>
  )
}
