'use client'

import clsx from 'clsx'
import { useEffect, useId, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'

const EASE_SHEET = [0.32, 0.72, 0, 1] as const

function subscribeMq(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', cb)
    return () => mq.removeEventListener('change', cb)
  }
}

/** true en pantallas ≥ breakpoint (por defecto sm = 640 px). */
export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    subscribeMq(query),
    () => window.matchMedia(query).matches,
    () => serverValue
  )
}

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  /** Zona fija inferior (CTA). */
  footer?: React.ReactNode
  /** Ancho máximo en escritorio. */
  width?: string
  /** false mientras hay una operación que no se debe interrumpir (p. ej. pago). */
  dismissible?: boolean
  /** Oculta el encabezado estándar (para contenido a medida). */
  bare?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Hoja inferior en móvil (sube desde abajo, con asa) y modal centrado en escritorio.
 * No usa el Dialog de Headless UI a propósito: su trampa de foco bloquearía el widget
 * de Wompi, que se monta fuera del árbol de React.
 */
export default function Sheet({
  open,
  onClose,
  title,
  description,
  footer,
  width = 'sm:max-w-lg',
  dismissible = true,
  bare,
  className,
  children,
}: SheetProps) {
  const desktop = useMediaQuery('(min-width: 640px)')
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, dismissible, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-scrim backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={clsx(
              'relative flex w-full flex-col overflow-hidden bg-surface border border-line-2 shadow-pop',
              'max-h-[92dvh] rounded-t-[28px] sm:rounded-[24px] sm:max-h-[88vh]',
              width,
              className
            )}
            initial={desktop ? { opacity: 0, y: 16, scale: 0.98 } : { y: '100%' }}
            animate={desktop ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }}
            exit={desktop ? { opacity: 0, y: 12, scale: 0.98 } : { y: '100%' }}
            transition={{ duration: desktop ? 0.25 : 0.38, ease: EASE_SHEET }}
          >
            <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-line-2" />
            </div>

            {!bare && (title || dismissible) && (
              <div className="flex items-start justify-between gap-4 px-5 pt-3 pb-1 sm:px-6 sm:pt-5">
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className="text-[19px] font-semibold tracking-[-0.02em] text-fg">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-1 text-[13.5px] text-fg-2">{description}</p>}
                </div>
                {dismissible && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg cursor-pointer"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

            {footer && (
              <div className="border-t border-line bg-surface px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
