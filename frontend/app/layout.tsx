import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/context'
import { ModalProvider } from '@/lib/context/modal-context'
import { BusinessProvider } from '@/lib/context/business-context'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ReservaCancha — Dashboard',
  description: 'Panel de administración de canchas sintéticas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="h-full">
        <AuthProvider>
          <BusinessProvider>
            <ModalProvider>{children}</ModalProvider>
          </BusinessProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
