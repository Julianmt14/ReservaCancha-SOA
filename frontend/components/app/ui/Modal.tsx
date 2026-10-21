'use client'

import Sheet from '@/components/ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  width?: string
  children: React.ReactNode
}

/**
 * API heredada de los formularios del panel. Ahora es una envoltura sobre <Sheet>:
 * hoja inferior en móvil y modal centrado en escritorio.
 */
export default function Modal({ open, onClose, title, width = 'max-w-lg', children }: Props) {
  // Los consumidores pasan "max-w-*"; en el Sheet solo aplica desde sm (en móvil ocupa todo el ancho).
  const sheetWidth = width
    .split(' ')
    .map((c) => (c.startsWith('max-w-') ? `sm:${c}` : c))
    .join(' ')
  return (
    <Sheet open={open} onClose={onClose} title={title} width={sheetWidth}>
      <div className="pt-2">{children}</div>
    </Sheet>
  )
}
