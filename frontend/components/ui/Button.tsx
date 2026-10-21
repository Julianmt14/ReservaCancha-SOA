import clsx from 'clsx'
import { forwardRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] disabled:hover:bg-accent',
  secondary: 'bg-surface-2 text-fg border border-line-2 hover:border-fg-3 hover:bg-surface-3',
  ghost: 'text-fg-2 hover:text-fg hover:bg-surface-2',
  danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white',
  inverse: 'bg-fg text-bg hover:opacity-90',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-11 px-4 text-[14px] gap-2 rounded-md lg:h-10',
  lg: 'h-13 px-5 text-[15px] gap-2 rounded-[14px]',
}

/** Clases de botón para usar en <a>/<Link> con el mismo aspecto. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string
) {
  return clsx(
    'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none cursor-pointer',
    'transition-[background-color,border-color,color,transform,opacity] duration-150 active:scale-[.98]',
    'disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100',
    VARIANT[variant],
    SIZE[size],
    className
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-block size-4 rounded-full border-2 border-current border-t-transparent animate-spin',
        className
      )}
    />
  )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  block?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading,
    block,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, clsx(block && 'w-full', className))}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
})

export default Button
