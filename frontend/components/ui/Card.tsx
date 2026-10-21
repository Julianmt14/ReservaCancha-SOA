import clsx from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Sin relleno interno (para tarjetas con media o tablas). */
  flush?: boolean
  /** Hover sutil para tarjetas clicables. */
  interactive?: boolean
}

export default function Card({ flush, interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-[20px] bg-surface border border-line shadow-card',
        !flush && 'p-5',
        interactive &&
          'transition-[border-color,transform] duration-200 hover:border-line-2 hover:-translate-y-0.5',
        className
      )}
      {...rest}
    />
  )
}

export function CardHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="text-overline text-fg-2 mb-2 flex items-center gap-2">{eyebrow}</div>}
        <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-fg leading-tight">{title}</h3>
      </div>
      {action}
    </div>
  )
}
