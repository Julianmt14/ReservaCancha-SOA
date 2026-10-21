import type { Metadata, Viewport } from 'next'
import { Anton, Inter_Tight, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/context'
import { ModalProvider } from '@/lib/context/modal-context'
import { BusinessProvider } from '@/lib/context/business-context'

// Display: titulares en MAYÚSCULAS (Anton) · UI: Inter Tight · Horas y precios: Geist Mono
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
})

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ReservaCancha — Reserva canchas sintéticas en Villavicencio',
  description: 'Reserva y paga tu cancha sintética en Villavicencio en segundos. Nequi, PSE o tarjeta.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#090C0A' },
    { media: '(prefers-color-scheme: light)', color: '#F5F6F2' },
  ],
}

// Aplica el tema guardado antes del primer pintado (evita el parpadeo claro/oscuro).
const themeScript = `try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-theme="dark"
      suppressHydrationWarning
      className={`${anton.variable} ${interTight.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full bg-bg text-fg">
        <AuthProvider>
          <BusinessProvider>
            <ModalProvider>{children}</ModalProvider>
          </BusinessProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
