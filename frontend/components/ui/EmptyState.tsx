import clsx from 'clsx'

interface Props {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
  tone?: 'neutral' | 'danger'
  className?: string
}

/** Estado vacío / error con ícono lineal y una acción opcional. */
export default function EmptyState({ title, description, action, icon, tone = 'neutral', className }: Props) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed px-6 py-12 text-center',
        tone === 'danger' ? 'border-danger/40 bg-danger-soft' : 'border-line-2',
        className
      )}
    >
      <div
        className={clsx(
          'grid size-12 place-items-center rounded-full',
          tone === 'danger' ? 'bg-danger/15 text-danger' : 'bg-surface-2 text-fg-2'
        )}
      >
        {icon ?? (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-[15px] font-semibold text-fg">{title}</p>
        {description && <p className="mt-1 max-w-sm text-[13.5px] text-fg-2">{description}</p>}
      </div>
      {action}
    </div>
  )
}
