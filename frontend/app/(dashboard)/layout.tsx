import DashboardShell from '@/components/app/layout/DashboardShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
