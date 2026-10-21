'use client'

import { useEffect } from 'react'
import { IconClose } from '@/components/app/icons'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  width?: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, width = 'max-w-lg', children }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full ${width} rounded-2xl flex flex-col max-h-[90vh]`}
        style={{ background: 'var(--panel)', border: '1px solid var(--line-2)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="size-8 rounded-lg grid place-items-center transition-colors cursor-pointer"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
