import type { Metadata, Viewport } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/context'
import { ModalProvider } from '@/lib/context/modal-context'
import { BusinessProvider } from '@/lib/context/business-context'

// Texto y titulares: Cabinet Grotesk (Fontshare, en <head>) · Códigos de reserva: Geist Mono
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

const CABINET_GROTESK = 'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&display=swap'

export const metadata: Metadata = {
  title: 'ReservaCancha — Reserva canchas sintéticas en Villavicencio',
  description: 'Reserva y paga tu cancha sintética en Villavicencio en segundos. Nequi, PSE o tarjeta.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#061F1B' },
    { media: '(prefers-color-scheme: light)', color: '#0B4A40' },
  ],
}

// Aplica el tema guardado antes del primer pintado (evita el parpadeo claro/oscuro).
const themeScript = `try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='dark'?'dark':'light'}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" suppressHydrationWarning className={`${geistMono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link rel="stylesheet" href={CABINET_GROTESK} />
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
