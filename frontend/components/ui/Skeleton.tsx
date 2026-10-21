import clsx from 'clsx'

export default function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('animate-pulse rounded-md bg-surface-2', className)} />
}
