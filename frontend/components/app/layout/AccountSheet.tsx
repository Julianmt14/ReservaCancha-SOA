'use client'

import { useAuth } from '@/lib/auth/context'
import Sheet from '@/components/ui/Sheet'
import Button from '@/components/ui/Button'
import Segmented from '@/components/ui/Segmented'
import { useTheme } from '@/components/ui/ThemeToggle'
import { IconLogout } from '@/components/app/icons'
import { initials } from '@/lib/format'
import { roleLabel } from './nav'

/** Hoja "Cuenta" en móvil: perfil, tema y cerrar sesión. */
export default function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <Sheet open={open} onClose={onClose} title="Mi cuenta" width="sm:max-w-sm">
      <div className="flex flex-col gap-5 px-5 pt-3 pb-6 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-accent text-[15px] font-bold text-accent-ink">
            {initials(user?.fullName)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold text-fg">{user?.fullName ?? '—'}</div>
            <div className="truncate text-[13px] text-fg-2">
              {user?.email} · {user?.role ? (roleLabel[user.role] ?? user.role) : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-line bg-bg-2 p-3">
          <span className="text-[14px] font-medium text-fg">Apariencia</span>
          <Segmented
            size="sm"
            value={theme}
            onChange={setTheme}
            aria-label="Tema"
            options={[
              { value: 'dark', label: 'Noche' },
              { value: 'light', label: 'Día' },
            ]}
          />
        </div>

        <Button variant="danger" block onClick={logout}>
          <IconLogout className="size-[17px]" />
          Cerrar sesión
        </Button>
      </div>
    </Sheet>
  )
}
