'use client'

import clsx from 'clsx'
import { motion } from 'motion/react'
import { useId } from 'react'

interface Option<T extends string> {
  value: T
  label: React.ReactNode
}

interface Props<T extends string> {
  value: T
  onChange: (v: T) => void
  options: Option<T>[]
  size?: 'sm' | 'md'
  block?: boolean
  className?: string
  'aria-label'?: string
}

/** Control segmentado con indicador animado (duración, periodo, pestañas). */
export default function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  block,
  className,
  ...aria
}: Props<T>) {
  const id = useId()
  return (
    <div
      role="tablist"
      aria-label={aria['aria-label']}
      className={clsx(
        'relative inline-flex items-center rounded-full bg-surface-2 border border-line p-1',
        block && 'flex w-full',
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'relative rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors duration-150',
              size === 'md' ? 'h-9 px-4 text-[13.5px]' : 'h-7 px-3 text-[12.5px]',
              block && 'flex-1',
              active ? 'text-bg' : 'text-fg-2 hover:text-fg'
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-fg"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
