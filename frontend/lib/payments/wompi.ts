// Apertura del widget de Wompi para el flujo nuevo (CheckoutSheet).
// Mismo contrato que WompiCheckoutModal: POST /api/pagos/iniciar → widget → POST /api/pagos/confirmar
// y sondeo de GET /api/pagos/reserva/{id} hasta que el pago deja de estar PENDING.

import type { PaymentIntentResponse, PaymentResponse } from '@/lib/api/payments'
import { getPayment } from '@/lib/api/payments'

const WOMPI_SCRIPT_URL = 'https://checkout.wompi.co/widget.js'
const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 20

type WompiResult = { transaction: { id: string; status: string } }
type WompiWidget = new (config: Record<string, unknown>) => {
  open: (callback: (result: WompiResult) => void) => void
}

function widgetCtor(): WompiWidget | undefined {
  return (window as unknown as { WidgetCheckout?: WompiWidget }).WidgetCheckout
}

export function loadWompiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (widgetCtor()) {
      resolve()
      return
    }
    const existing = document.querySelector(`script[src="${WOMPI_SCRIPT_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Wompi')))
      return
    }
    const script = document.createElement('script')
    script.src = WOMPI_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Wompi'))
    document.head.appendChild(script)
  })
}

/** Abre el widget; `onTransaction` se llama cuando el usuario termina el pago en Wompi. */
export async function openWompiWidget(
  intent: PaymentIntentResponse,
  onTransaction: (transactionId: string) => void
): Promise<void> {
  await loadWompiScript()
  const Widget = widgetCtor()
  if (!Widget) throw new Error('Widget de Wompi no disponible')
  const checkout = new Widget({
    currency: intent.currency,
    amountInCents: intent.amountInCents,
    reference: intent.reference,
    publicKey: intent.publicKey,
    signature: { integrity: intent.integritySignature },
  })
  checkout.open((result) => onTransaction(result.transaction.id))
}

/** Consulta el pago hasta que deja de estar pendiente (o se agotan los intentos). */
export function pollPayment(bookingId: number, onDone: (p: PaymentResponse) => void): () => void {
  let attempts = 0
  const timer = setInterval(async () => {
    attempts++
    try {
      const p = await getPayment(bookingId)
      if (p.status !== 'PENDING' || attempts >= POLL_MAX_ATTEMPTS) {
        clearInterval(timer)
        onDone(p)
      }
    } catch {
      // se reintenta en el siguiente ciclo
    }
  }, POLL_INTERVAL_MS)
  return () => clearInterval(timer)
}
