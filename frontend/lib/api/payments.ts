import { apiFetch, ApiError } from './client'
import type { Page } from './courts'

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR'

export interface PaymentIntentResponse {
  bookingId: number
  reference: string
  amountInCents: number
  currency: string
  publicKey: string
  integritySignature: string
}

export interface PaymentResponse {
  id: number
  bookingId: number
  wompiTransactionId: string | null
  wompiReference: string
  amountInCents: number
  currency: string
  status: PaymentStatus
  paymentMethod: string | null
  createdAt: string
  updatedAt: string
}

export interface BusinessPaymentResponse {
  paymentId: number
  bookingId: number
  bookingCode: string
  courtId: number
  courtName: string
  playerId: number
  playerName: string
  playerPhone: string
  startAt: string
  endAt: string
  bookingStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  amountInCents: number
  currency: string
  paymentStatus: PaymentStatus
  paymentMethod: string | null
  wompiReference: string | null
  paymentCreatedAt: string
}

/** Respuesta de POST /api/pagos/iniciar/{reservaId}. */
interface IntentDto {
  referencia: string
  valorCentavos: number
  moneda: string
  firmaIntegridad: string
  llavePublica: string
  reservaId: number
}

/** Pago como lo entregan /api/pagos/reserva/{id}, /confirmar y /api/admin/pagos. */
interface PagoDto {
  id: number
  reserva: {
    id: number
    usuario: { id: number; nombre: string }
    cancha: { id: number; nombre: string }
    fecha: string
    horaInicio: string
    horaFin: string
    estado: string
  }
  valor: number
  moneda: string
  referencia: string
  wompiTransactionId: string | null
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'FALLIDO'
  creadoEn: string
  actualizadoEn: string
}

const STATUS: Record<PagoDto['estado'], PaymentStatus> = {
  PENDIENTE: 'PENDING',
  APROBADO: 'APPROVED',
  RECHAZADO: 'DECLINED',
  FALLIDO: 'ERROR',
}

const cents = (valor: number) => Math.round(Number(valor) * 100)

function toPayment(p: PagoDto): PaymentResponse {
  return {
    id: p.id,
    bookingId: p.reserva.id,
    wompiTransactionId: p.wompiTransactionId,
    wompiReference: p.referencia,
    amountInCents: cents(p.valor),
    currency: p.moneda,
    status: STATUS[p.estado],
    paymentMethod: null,
    createdAt: p.creadoEn,
    updatedAt: p.actualizadoEn,
  }
}

function toBookingStatus(estado: string): BusinessPaymentResponse['bookingStatus'] {
  if (estado === 'PAGADA' || estado === 'CONFIRMADA') return 'CONFIRMED'
  if (estado === 'CANCELADA' || estado === 'NO_SHOW') return 'CANCELLED'
  return 'PENDING'
}

export async function createPaymentIntent(bookingId: number): Promise<PaymentIntentResponse> {
  const dto = await apiFetch<IntentDto>(`/api/pagos/iniciar/${bookingId}`, { method: 'POST' })
  return {
    bookingId: dto.reservaId,
    reference: dto.referencia,
    amountInCents: dto.valorCentavos,
    currency: dto.moneda,
    publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || dto.llavePublica,
    integritySignature: dto.firmaIntegridad,
  }
}

/** Ultimo intento de pago de la reserva. */
export async function getPayment(bookingId: number): Promise<PaymentResponse> {
  const pagos = await apiFetch<PagoDto[]>(`/api/pagos/reserva/${bookingId}`)
  if (pagos.length === 0) throw new ApiError(404, 'La reserva no tiene pagos')
  return toPayment(pagos[pagos.length - 1])
}

/** Pagos de todas las reservas (solo administrador / propietario). */
export async function getBusinessPayments(
  _businessId: number,
  page = 0,
  size = 20
): Promise<Page<BusinessPaymentResponse>> {
  const pagos = await apiFetch<PagoDto[]>('/api/admin/pagos')
  const rows = pagos
    .map<BusinessPaymentResponse>((p) => ({
      paymentId: p.id,
      bookingId: p.reserva.id,
      bookingCode: `RC-${p.reserva.id}`,
      courtId: p.reserva.cancha.id,
      courtName: p.reserva.cancha.nombre,
      playerId: p.reserva.usuario.id,
      playerName: p.reserva.usuario.nombre,
      playerPhone: '',
      startAt: `${p.reserva.fecha}T${p.reserva.horaInicio}`,
      endAt: `${p.reserva.fecha}T${p.reserva.horaFin}`,
      bookingStatus: toBookingStatus(p.reserva.estado),
      amountInCents: cents(p.valor),
      currency: p.moneda,
      paymentStatus: STATUS[p.estado],
      paymentMethod: null,
      wompiReference: p.referencia,
      paymentCreatedAt: p.creadoEn,
    }))
    .sort((a, b) => b.paymentCreatedAt.localeCompare(a.paymentCreatedAt))
  return {
    content: rows.slice(page * size, (page + 1) * size),
    totalElements: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / size)),
    number: page,
    size,
  }
}

/** El backend verifica la transaccion directamente con Wompi antes de marcar la reserva como pagada. */
export async function confirmPayment(bookingId: number, transactionId: string): Promise<PaymentResponse> {
  const pago = await apiFetch<PagoDto>(
    `/api/pagos/confirmar/${bookingId}?transactionId=${encodeURIComponent(transactionId)}`,
    { method: 'POST' }
  )
  return toPayment(pago)
}
