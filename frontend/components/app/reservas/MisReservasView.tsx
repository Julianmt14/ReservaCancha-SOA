'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { getMyBookings, cancelBooking, type BookingResponse } from '@/lib/api/bookings'
import { getCourts, type CourtResponse } from '@/lib/api/courts'
import { ESTABLISHMENT } from '@/lib/api/businesses'
import Button, { buttonClasses } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import Sheet from '@/components/ui/Sheet'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { IconCard, IconRepeat, IconWhatsApp, IconCalendarPlus, IconPin } from '@/components/app/icons'
import CourtArt from '@/components/app/booking/CourtArt'
import CheckoutSheet from '@/components/app/booking/CheckoutSheet'
import { downloadIcs, mapsUrl, whatsappShareUrl } from '@/components/app/booking/share'
import { addDays, formatCOP, formatDayLong, formatDuration, formatHour, hourOf, isoDate } from '@/lib/format'

const VENUE = ESTABLISHMENT.name
const ADDRESS = ESTABLISHMENT.address

function totalOf(b: BookingResponse, courts: Map<number, CourtResponse>): number | null {
  const c = courts.get(b.courtId)
  return c ? c.pricePerHour * (hourOf(b.endAt) - hourOf(b.startAt)) : null
}

/** "Mañana, 20:00" · "Sábado 17 de octubre, 19:00" */
function when(b: BookingResponse, now: number): string {
  const iso = b.startAt.slice(0, 10)
  const today = new Date(now)
  const long = formatDayLong(iso)
  const day =
    iso === isoDate(today)
      ? 'Hoy'
      : iso === isoDate(addDays(today, 1))
        ? 'Mañana'
        : long.charAt(0).toUpperCase() + long.slice(1)
  return `${day}, ${formatHour(hourOf(b.startAt))}`
}

/** Cuenta regresiva con segundos, como en la propuesta: "1 d 04 h 12 min 09 s". */
function countdown(ms: number): string {
  let s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  s %= 86400
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d ? `${d} d ` : ''}${pad(Math.floor(s / 3600))} h ${pad(Math.floor((s % 3600) / 60))} min ${pad(s % 60)} s`
}

export default function MisReservasView() {
  const router = useRouter()
  const { user } = useAuth()
  const [data, setData] = useState<{
    bookings: BookingResponse[]
    courts: Map<number, CourtResponse>
  } | null>(null)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [players, setPlayers] = useState(10)
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

  // Reloj de la cuenta regresiva
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const reload = () => setVersion((v) => v + 1)

  const bookings = data?.bookings ?? []
  const courts = data?.courts ?? new Map<number, CourtResponse>()
  const upcoming = bookings.filter((b) => b.status !== 'CANCELLED' && new Date(b.endAt).getTime() >= now)
  const past = bookings.filter((b) => b.status !== 'CANCELLED' && new Date(b.endAt).getTime() < now).reverse()
  const cancelled = bookings.filter((b) => b.status === 'CANCELLED').reverse()
  const [next, ...rest] = upcoming

  const year = new Date(now).getFullYear()
  const playedThisYear = past.filter((b) => new Date(b.startAt).getFullYear() === year).length
  const distinctCourts = new Set(bookings.filter((b) => b.status !== 'CANCELLED').map((b) => b.courtId)).size
  const pending = upcoming.filter((b) => b.status === 'PENDING').length
  const firstName = user?.fullName?.split(' ')[0] ?? ''

  const nextTotal = next ? totalOf(next, courts) : null
  const nextStarted = next ? new Date(next.startAt).getTime() <= now : false
  const each = nextTotal != null ? Math.ceil(nextTotal / players / 500) * 500 : null

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
    const pendingPay = b.status === 'PENDING'
    const total = totalOf(b, courts)
    return (
      <div className="flex flex-wrap gap-2">
        {upcomingBooking && pendingPay && (
          <Button size="sm" onClick={() => openPay(b)} className="shrink-0 font-extrabold">
            <IconCard className="size-4" />
            Pagar {total != null ? formatCOP(total) : ''}
          </Button>
        )}
        {upcomingBooking && (
          <a
            href={whatsappShareUrl(b, VENUE)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('secondary', 'sm', 'shrink-0 font-bold')}
          >
            <IconWhatsApp className="size-4 text-[#25D366]" />
            Compartir
          </a>
        )}
        {upcomingBooking && (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 font-bold"
            onClick={() => downloadIcs(b, VENUE, ADDRESS)}
          >
            <IconCalendarPlus className="size-4" />
            Calendario
          </Button>
        )}
        {!upcomingBooking && (
          <Button variant="secondary" size="sm" className="shrink-0 font-bold" onClick={() => bookAgain(b)}>
            <IconRepeat className="size-4" />
            Reservar otra vez
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

  function row(b: BookingResponse, kind: 'futura' | 'pasada' | 'cancelada', i: number) {
    const start = hourOf(b.startAt)
    const end = hourOf(b.endAt)
    const total = totalOf(b, courts)
    return (
      <article
        key={b.id}
        className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-3.5 rounded-[18px] border border-line bg-surface p-3 sm:grid-cols-[72px_minmax(0,1fr)]"
      >
        <div className="size-[60px] overflow-hidden rounded-[14px] sm:size-[72px]">
          <CourtArt variant={i} className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <b className="block truncate text-[17px] font-extrabold text-fg">{b.courtName}</b>
          <small className="num block text-[14px] text-fg-2">
            {when(b, now)}–{formatHour(end)} · {formatDuration(end - start)}
            {total != null && ` · ${formatCOP(total)}`}
          </small>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} />
            <span className="font-mono text-[12px] text-fg-3">{b.bookingCode}</span>
          </div>
        </div>
        {kind !== 'cancelada' && (
          <div className="col-span-full border-t border-line pt-3">{actions(b, kind === 'futura')}</div>
        )}
      </article>
    )
  }

  return (
    <div className="flex flex-col pb-12">
      {/* Saludo en la franja verde */}
      <section data-zona="verde" className="bg-bg px-4 pt-6 pb-[90px] text-fg sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-[1120px]">
          <h1 className="text-display text-[clamp(36px,4.4vw,60px)] leading-none tracking-[-0.035em]">
            Hola{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-2 text-[18px] text-fg-2">
            {!data
              ? 'Tus partidos, pagos y comprobantes.'
              : upcoming.length
                ? `Tienes ${upcoming.length} ${upcoming.length === 1 ? 'partido' : 'partidos'} por jugar.`
                : 'No tienes partidos por jugar. Aparta uno en segundos.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-fg-2">
            <span>
              <b className="num mr-1.5 text-[22px] font-extrabold text-fg">{data ? playedThisYear : '—'}</b>
              {playedThisYear === 1 ? 'partido' : 'partidos'} este año
            </span>
            <span>
              <b className="num mr-1.5 text-[22px] font-extrabold text-fg">{data ? distinctCourts : '—'}</b>
              {distinctCourts === 1 ? 'cancha distinta' : 'canchas distintas'}
            </span>
            <span>
              <b className="num mr-1.5 text-[22px] font-extrabold text-fg">{data ? pending : '—'}</b>
              pendientes de pago
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8">
        {!data && !error && <Skeleton className="-mt-16 h-[320px] rounded-[26px]" />}

        {error && (
          <EmptyState
            className="-mt-16 bg-surface"
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

        {/* Próximo partido */}
        {data && next && (
          <article className="-mt-16 grid overflow-hidden rounded-[26px] border border-line bg-surface shadow-[0_30px_60px_-36px_rgba(11,74,64,0.5)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div className="relative min-h-[220px] md:min-h-[300px]">
              <div className="absolute inset-0">
                <CourtArt className="h-full w-full" />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(6,31,27,0.85))]" />
              <span className="absolute top-4 left-4 rounded-full bg-white px-3 py-1.5 text-[13px] font-extrabold text-botella">
                Tu próximo partido
              </span>
              <div className="absolute inset-x-4 bottom-4 text-white">
                <small className="text-[12px] font-bold tracking-[0.08em] text-[#CFE5DE] uppercase">
                  {nextStarted ? 'En juego' : 'Faltan'}
                </small>
                <b className="num block text-[clamp(26px,3.4vw,34px)] font-extrabold tracking-[-0.03em]">
                  {nextStarted ? 'Ya empezó' : countdown(new Date(next.startAt).getTime() - now)}
                </b>
              </div>
            </div>
            <div className="grid content-start gap-3.5 p-5 sm:p-7">
              <h2 className="text-[28px] leading-[1.05] font-extrabold tracking-[-0.03em] text-fg">
                {VENUE} · {next.courtName}
                <small className="num mt-1 block text-[16px] font-medium tracking-normal text-fg-2">
                  {when(next, now)}–{formatHour(hourOf(next.endAt))} ·{' '}
                  {formatDuration(hourOf(next.endAt) - hourOf(next.startAt))}
                </small>
              </h2>
              <div className="rounded-[16px] bg-surface-2 p-3.5">
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-[15px]">
                  <dt className="text-fg-2">Código</dt>
                  <dd className="font-mono font-bold text-fg">{next.bookingCode}</dd>
                  <dt className="text-fg-2">Valor</dt>
                  <dd className="num font-bold text-fg">{nextTotal != null ? formatCOP(nextTotal) : '—'}</dd>
                  <dt className="text-fg-2">Pago</dt>
                  <dd>
                    <StatusBadge status={next.status} />
                  </dd>
                  <dt className="text-fg-2">Dirección</dt>
                  <dd className="font-bold text-fg">{ADDRESS}</dd>
                </dl>
              </div>
              <a
                href={mapsUrl(`${VENUE} ${ADDRESS}`)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses('primary', 'md', 'justify-self-start rounded-[12px] font-extrabold')}
              >
                <IconPin className="size-4" />
                Cómo llegar
              </a>
              <div className="border-t border-line pt-3.5">{actions(next, true)}</div>
            </div>
          </article>
        )}

        {data && !next && (
          <div className="-mt-16 rounded-[26px] border border-line bg-surface shadow-[0_30px_60px_-36px_rgba(11,74,64,0.5)]">
            <EmptyState
              className="border-0"
              title="No tienes partidos próximos"
              description="Elige día y hora y aparta tu cancha en segundos."
              action={
                <Link href="/" className={buttonClasses('primary', 'md', 'rounded-full font-extrabold')}>
                  Reservar cancha
                </Link>
              }
            />
          </div>
        )}

        {/* Dividir el pago */}
        {data && next && each != null && (
          <div className="mt-3.5 grid grid-cols-1 items-center gap-3.5 rounded-[20px] bg-success-soft p-[18px] sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <b className="text-[18px] font-extrabold text-fg">Divide el pago con tu equipo</b>
              <p className="mt-1 text-[#35554C]">
                Calcula cuánto pone cada uno y manda el cobro al grupo de WhatsApp.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                aria-label="Menos jugadores"
                onClick={() => setPlayers((n) => Math.max(2, n - 1))}
                className="grid size-9 place-items-center rounded-full bg-white text-[20px] leading-none font-extrabold text-botella shadow-[inset_0_0_0_1.5px_#BFE3D3] cursor-pointer"
              >
                −
              </button>
              <output className="num min-w-[30px] text-center text-[22px] font-extrabold text-fg">
                {players}
              </output>
              <button
                type="button"
                aria-label="Más jugadores"
                onClick={() => setPlayers((n) => Math.min(22, n + 1))}
                className="grid size-9 place-items-center rounded-full bg-white text-[20px] leading-none font-extrabold text-botella shadow-[inset_0_0_0_1.5px_#BFE3D3] cursor-pointer"
              >
                +
              </button>
              <span className="text-[#35554C]">jugadores ·</span>
              <span className="num text-[26px] font-extrabold tracking-[-0.02em] text-botella">
                {formatCOP(each)} c/u
              </span>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Partido en ${VENUE} (${next.courtName}) ${when(next, now).toLowerCase()}. Somos ${players}: cada uno pone ${formatCOP(each)}. Código de la reserva: ${next.bookingCode}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses('primary', 'md', 'justify-self-start rounded-[12px] font-extrabold')}
            >
              <IconWhatsApp className="size-4" />
              Mandar el cobro al grupo
            </a>
          </div>
        )}

        {data && (
          <section className="mt-10">
            <h3 className="mb-3.5 text-[24px] font-extrabold tracking-[-0.02em] text-fg">Por jugar</h3>
            {rest.length ? (
              <div className="grid gap-2.5">{rest.map((b, i) => row(b, 'futura', i + 1))}</div>
            ) : (
              <p className="text-fg-2">
                {next ? 'Nada más por ahora, aparte del próximo partido.' : 'Nada por ahora.'}
              </p>
            )}
          </section>
        )}

        {data && (
          <section className="mt-10">
            <h3 className="mb-3.5 text-[24px] font-extrabold tracking-[-0.02em] text-fg">Ya jugadas</h3>
            {past.length ? (
              <div className="grid gap-2.5">{past.map((b, i) => row(b, 'pasada', i))}</div>
            ) : (
              <p className="text-fg-2">Tus partidos jugados aparecerán aquí.</p>
            )}
          </section>
        )}

        {data && cancelled.length > 0 && (
          <section className="mt-10">
            <h3 className="mb-3.5 text-[24px] font-extrabold tracking-[-0.02em] text-fg">Canceladas</h3>
            <div className="grid gap-2.5 opacity-80">{cancelled.map((b, i) => row(b, 'cancelada', i))}</div>
          </section>
        )}
      </div>

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
            <div className="rounded-[16px] bg-accent-soft p-3.5">
              <div className="truncate text-[15px] font-extrabold text-fg">{toCancel.courtName}</div>
              <div className="num mt-1 text-[14px] text-fg-2">
                {when(toCancel, now)}–{formatHour(hourOf(toCancel.endAt))}
              </div>
              <div className="mt-1 font-mono text-[12px] text-fg-3">{toCancel.bookingCode}</div>
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
