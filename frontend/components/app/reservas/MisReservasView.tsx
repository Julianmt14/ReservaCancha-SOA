'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { getMyBookings, cancelBooking, type BookingResponse } from '@/lib/api/bookings'
import { getCourts, type CourtResponse } from '@/lib/api/courts'
import { ESTABLISHMENT } from '@/lib/api/businesses'
import Segmented from '@/components/ui/Segmented'
import Button, { buttonClasses } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import Sheet from '@/components/ui/Sheet'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { IconCard, IconRepeat, IconWhatsApp, IconCalendarPlus } from '@/components/app/icons'
import BookingTicket from '@/components/app/booking/BookingTicket'
import CheckoutSheet from '@/components/app/booking/CheckoutSheet'
import { downloadIcs, whatsappShareUrl } from '@/components/app/booking/share'
import { formatCOP, formatCountdown, formatDuration, formatHour, hourOf, parseIsoDate } from '@/lib/format'

type Tab = 'proximas' | 'pasadas' | 'canceladas'

const VENUE = ESTABLISHMENT.name
const ADDRESS = ESTABLISHMENT.address

function totalOf(b: BookingResponse, courts: Map<number, CourtResponse>): number | null {
  const c = courts.get(b.courtId)
  return c ? c.pricePerHour * (hourOf(b.endAt) - hourOf(b.startAt)) : null
}

/** Fecha en bloque: día de la semana, número grande y mes. */
function DateBlock({ iso, muted }: { iso: string; muted?: boolean }) {
  const d = parseIsoDate(iso)
  return (
    <div
      className={clsx(
        'grid w-16 shrink-0 content-center justify-items-center gap-1 rounded-[14px] border border-line py-2.5',
        muted ? 'bg-bg-2' : 'bg-surface-2'
      )}
    >
      <span className="text-overline text-fg-2">
        {d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')}
      </span>
      <span className="text-display text-[30px] leading-none text-fg">{d.getDate()}</span>
      <span className="text-overline text-fg-3">
        {d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}
      </span>
    </div>
  )
}

export default function MisReservasView() {
  const router = useRouter()
  const [data, setData] = useState<{
    bookings: BookingResponse[]
    courts: Map<number, CourtResponse>
  } | null>(null)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState<Tab>('proximas')
  const [toCancel, setToCancel] = useState<BookingResponse | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [pay, setPay] = useState<{ key: number; booking: BookingResponse } | null>(null)
  const [payOpen, setPayOpen] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([getMyBookings(0, 200), getCourts(0, 100).catch(() => null)])
      .then(([page, courts]) => {
        if (!alive) return
        setData({ bookings: page.content, courts: new Map((courts?.content ?? []).map((c) => [c.id, c])) })
        setError(false)
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [version])

  const reload = () => setVersion((v) => v + 1)

  const now = new Date().getTime()
  const bookings = data?.bookings ?? []
  const courts = data?.courts ?? new Map<number, CourtResponse>()
  const upcoming = bookings.filter((b) => b.status !== 'CANCELLED' && new Date(b.endAt).getTime() >= now)
  const past = bookings.filter((b) => b.status !== 'CANCELLED' && new Date(b.endAt).getTime() < now).reverse()
  const cancelled = bookings.filter((b) => b.status === 'CANCELLED').reverse()
  const [next, ...rest] = upcoming
  const list = tab === 'proximas' ? rest : tab === 'pasadas' ? past : cancelled

  async function confirmCancel() {
    if (!toCancel) return
    setCanceling(true)
    try {
      const updated = await cancelBooking(toCancel.id)
      setData((d) => d && { ...d, bookings: d.bookings.map((b) => (b.id === updated.id ? updated : b)) })
      setToCancel(null)
    } catch {
      // se mantiene abierta la hoja; el usuario puede reintentar
    } finally {
      setCanceling(false)
    }
  }

  function bookAgain(b: BookingResponse) {
    // Misma cancha y hora, la semana siguiente (o la próxima semana desde hoy)
    const start = new Date(b.startAt)
    while (start.getTime() <= now) start.setDate(start.getDate() + 7)
    const pad = (n: number) => String(n).padStart(2, '0')
    sessionStorage.setItem('openCourtId', String(b.courtId))
    sessionStorage.setItem(
      'openCourtWeekDate',
      `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}:00`
    )
    router.push('/')
  }

  function openPay(b: BookingResponse) {
    setPay((p) => ({ key: (p?.key ?? 0) + 1, booking: b }))
    setPayOpen(true)
  }

  function actions(b: BookingResponse, upcomingBooking: boolean) {
    const pending = b.status === 'PENDING'
    return (
      <div className="flex flex-wrap gap-2">
        {upcomingBooking && pending && (
          <Button size="sm" onClick={() => openPay(b)} className="shrink-0">
            <IconCard className="size-4" />
            Pagar {totalOf(b, courts) != null ? formatCOP(totalOf(b, courts)!) : ''}
          </Button>
        )}
        {upcomingBooking && (
          <a
            href={whatsappShareUrl(b, VENUE)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('secondary', 'sm', 'shrink-0')}
          >
            <IconWhatsApp className="size-4 text-[#25D366]" />
            Compartir
          </a>
        )}
        {upcomingBooking && (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => downloadIcs(b, VENUE, ADDRESS)}
          >
            <IconCalendarPlus className="size-4" />
            Calendario
          </Button>
        )}
        {!upcomingBooking && (
          <Button variant="secondary" size="sm" className="shrink-0" onClick={() => bookAgain(b)}>
            <IconRepeat className="size-4" />
            Reservar de nuevo
          </Button>
        )}
        {upcomingBooking && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0 hover:text-danger"
            onClick={() => setToCancel(b)}
          >
            Cancelar
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Segmented
        block
        className="sm:w-auto sm:self-start"
        value={tab}
        onChange={setTab}
        aria-label="Filtrar reservas"
        options={[
          { value: 'proximas', label: `Próximas${upcoming.length ? ` · ${upcoming.length}` : ''}` },
          { value: 'pasadas', label: 'Pasadas' },
          { value: 'canceladas', label: 'Canceladas' },
        ]}
      />

      {!data && !error && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[300px] rounded-[24px]" />
          <Skeleton className="h-[120px] rounded-[20px]" />
        </div>
      )}

      {error && (
        <EmptyState
          tone="danger"
          title="No pudimos cargar tus reservas"
          description="Revisa tu conexión e intenta de nuevo."
          action={
            <Button variant="secondary" size="sm" onClick={reload}>
              Reintentar
            </Button>
          }
        />
      )}

      {data && tab === 'proximas' && next && (
        <section>
          <BookingTicket
            booking={next}
            venueName={VENUE}
            total={totalOf(next, courts)}
            eyebrow={
              <span className="text-accent-text">
                Tu próximo partido · juegas en {formatCountdown(new Date(next.startAt).getTime() - now)}
              </span>
            }
          >
            {actions(next, true)}
          </BookingTicket>
        </section>
      )}

      {data && tab === 'proximas' && !next && (
        <EmptyState
          title="No tienes partidos próximos"
          description="Elige día y hora y aparta tu cancha en segundos."
          action={
            <Link href="/" className={buttonClasses('primary', 'md')}>
              Reservar cancha
            </Link>
          }
        />
      )}

      {data && tab !== 'proximas' && list.length === 0 && (
        <EmptyState
          title={tab === 'pasadas' ? 'Aún no has jugado' : 'Sin reservas canceladas'}
          description={tab === 'pasadas' ? 'Tus partidos jugados aparecerán aquí.' : undefined}
        />
      )}

      {data && list.length > 0 && (
        <section className="flex flex-col gap-3">
          {tab === 'proximas' && <h2 className="text-overline text-fg-3">Más adelante</h2>}
          {list.map((b) => {
            const start = hourOf(b.startAt)
            const end = hourOf(b.endAt)
            const total = totalOf(b, courts)
            const isUpcoming = tab === 'proximas'
            return (
              <article
                key={b.id}
                className="rounded-[20px] border border-line bg-surface p-3 shadow-card sm:p-4"
              >
                <div className="flex gap-4">
                  <DateBlock iso={b.startAt.slice(0, 10)} muted={!isUpcoming} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold text-fg">{b.courtName}</div>
                        <div className="num mt-1 text-[14px] text-fg-2">
                          {formatHour(start)}–{formatHour(end)} · {formatDuration(end - start)}
                        </div>
                      </div>
                      {total != null && (
                        <div className="num shrink-0 text-[15px] font-semibold text-fg">
                          {formatCOP(total)}
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <StatusBadge status={b.status} />
                      <span className="num text-[12px] text-fg-3">{b.bookingCode}</span>
                    </div>
                  </div>
                </div>
                {tab !== 'canceladas' && (
                  <div className="mt-3 border-t border-line pt-3">{actions(b, isUpcoming)}</div>
                )}
              </article>
            )
          })}
        </section>
      )}

      {/* Confirmar cancelación */}
      <Sheet
        open={toCancel !== null}
        onClose={() => !canceling && setToCancel(null)}
        dismissible={!canceling}
        title="¿Cancelar la reserva?"
        description="El horario quedará libre para otros jugadores."
        width="sm:max-w-md"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setToCancel(null)} disabled={canceling}>
              No, mantener
            </Button>
            <Button variant="danger" onClick={confirmCancel} loading={canceling}>
              Sí, cancelar
            </Button>
          </div>
        }
      >
        {toCancel && (
          <div className="px-5 pt-3 pb-5 sm:px-6">
            <div className="flex gap-4 rounded-[16px] border border-line bg-bg-2 p-3">
              <DateBlock iso={toCancel.startAt.slice(0, 10)} />
              <div className="min-w-0 self-center">
                <div className="truncate text-[15px] font-semibold text-fg">{toCancel.courtName}</div>
                <div className="num mt-1 text-[14px] text-fg-2">
                  {formatHour(hourOf(toCancel.startAt))}–{formatHour(hourOf(toCancel.endAt))}
                </div>
                <div className="num mt-1 text-[12px] text-fg-3">{toCancel.bookingCode}</div>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {pay && (
        <CheckoutSheet
          key={pay.key}
          open={payOpen}
          onClose={() => setPayOpen(false)}
          venueName={VENUE}
          address={ADDRESS}
          booking={pay.booking}
          pricePerHour={courts.get(pay.booking.courtId)?.pricePerHour}
          onPaid={reload}
        />
      )}
    </div>
  )
}
