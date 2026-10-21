interface FieldProps {
  label: string
  error?: string
  children: React.ReactNode
}

export function FormField({ label, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[11px]" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

const inputStyle = {
  background: 'var(--bg-2)',
  border: '1px solid var(--line)',
  color: 'var(--text)',
}

const focusStyle = { borderColor: 'var(--green)' }
const blurStyle = { borderColor: 'var(--line)' }

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors cursor-text ${props.className ?? ''}`}
      style={{ ...inputStyle, ...props.style }}
      onFocus={(e) => {
        Object.assign(e.currentTarget.style, focusStyle)
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        Object.assign(e.currentTarget.style, blurStyle)
        props.onBlur?.(e)
      }}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors cursor-pointer ${props.className ?? ''}`}
      style={{ ...inputStyle, ...props.style }}
      onFocus={(e) => {
        Object.assign(e.currentTarget.style, focusStyle)
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        Object.assign(e.currentTarget.style, blurStyle)
        props.onBlur?.(e)
      }}
    />
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors resize-none ${props.className ?? ''}`}
      style={{ ...inputStyle, ...props.style }}
      onFocus={(e) => {
        Object.assign(e.currentTarget.style, focusStyle)
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        Object.assign(e.currentTarget.style, blurStyle)
        props.onBlur?.(e)
      }}
    />
  )
}

interface SubmitRowProps {
  onCancel: () => void
  loading: boolean
  label: string
  loadingLabel?: string
}

export function SubmitRow({ onCancel, loading, label, loadingLabel }: SubmitRowProps) {
  return (
    <div
      className="flex items-center justify-end gap-3 px-6 py-4"
      style={{ borderTop: '1px solid var(--line)' }}
    >
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
        style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--line)' }}
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
        style={{ background: 'var(--green)', color: '#fff' }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.background = 'var(--green-deep)'
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.background = 'var(--green)'
        }}
      >
        {loading ? (loadingLabel ?? 'Guardando…') : label}
      </button>
    </div>
  )
}
