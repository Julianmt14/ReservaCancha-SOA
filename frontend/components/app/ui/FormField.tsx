import clsx from 'clsx'
import Button from '@/components/ui/Button'

interface FieldProps {
  label: string
  error?: string
  children: React.ReactNode
}

export function FormField({ label, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-medium text-fg-2">{label}</label>
      {children}
      {error && <p className="text-[11.5px] text-danger">{error}</p>}
    </div>
  )
}

const fieldClasses =
  'w-full rounded-md border border-line-2 bg-bg-2 px-3 h-12 lg:h-11 text-[16px] lg:text-sm text-fg outline-none transition-colors placeholder:text-fg-3 focus:border-accent-line focus:ring-4 focus:ring-accent-soft'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(fieldClasses, 'cursor-text', props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(fieldClasses, 'cursor-pointer', props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(fieldClasses, 'h-auto lg:h-auto py-2.5 resize-none', props.className)}
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
    <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
      <Button variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" loading={loading}>
        {loading ? (loadingLabel ?? 'Guardando…') : label}
      </Button>
    </div>
  )
}
