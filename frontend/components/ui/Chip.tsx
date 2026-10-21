import clsx from 'clsx'

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  size?: 'sm' | 'md'
  icon?: React.ReactNode
}

/** Píldora de filtro / opción (deporte, franja horaria…). La activa va en el acento (verde botella; blanco sobre fondo oscuro). */
export default function Chip({ selected, size = 'md', icon, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap font-medium cursor-pointer select-none',
        'transition-[background-color,border-color,color,transform] duration-150 active:scale-[.97]',
        size === 'md' ? 'h-10 px-4 text-[14px]' : 'h-8 px-3 text-[12.5px]',
        selected
          ? 'bg-accent border-accent text-accent-ink font-semibold'
          : 'bg-transparent border-line-2 text-fg hover:border-fg-3',
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export type TimeChipState = 'free' | 'selected' | 'busy' | 'closed'

interface TimeChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  time: string
  /** Precio o nota bajo la hora ("$90.000", "Ocupado"). */
  caption?: React.ReactNode
  state: TimeChipState
  /** Variante compacta de una sola línea para tarjetas. */
  compact?: boolean
}

/** Celda de horario: hora en mono + precio. Ocupado: tachado y atenuado. Seleccionado: acento. */
export function TimeChip({ time, caption, state, compact, className, ...rest }: TimeChipProps) {
  const disabled = state === 'busy' || state === 'closed'
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={state === 'selected'}
      className={clsx(
        'group border text-left select-none transition-[background-color,border-color,color,transform,box-shadow] duration-150',
        compact
          ? 'h-10 px-3.5 rounded-full inline-flex items-center justify-center'
          : 'min-h-14 px-3 py-2.5 rounded-[12px] grid gap-0.5 content-center',
        state === 'selected' && 'bg-accent border-accent text-accent-ink shadow-glow',
        state === 'free' &&
          'bg-transparent border-line-2 text-fg cursor-pointer hover:border-accent-line active:scale-[.97]',
        disabled && 'border-line text-fg cursor-not-allowed opacity-[.38] line-through',
        className
      )}
      {...rest}
    >
      <span className={clsx('num font-semibold leading-none', compact ? 'text-[14px]' : 'text-[15px]')}>
        {time}
      </span>
      {!compact && caption != null && (
        <small
          className={clsx(
            'text-[12px] leading-tight',
            state === 'selected' ? 'text-accent-ink/75' : 'text-fg-2',
            state === 'free' && 'num'
          )}
        >
          {caption}
        </small>
      )}
    </button>
  )
}
