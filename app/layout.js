// app/layout.js
import './globals.css'
import { Ubuntu } from 'next/font/google'
import RegisterSW from '../components/RegisterSW'

// Carrega a fonte do Google
const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
})

export const metadata = {
  title: 'Intento | Mentoria',
  description: 'Plataforma de mentoria Intento — vestibulares e ENEM',
  applicationName: 'Intento',
  appleWebApp: {
    capable: true,
    title: 'Intento',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/icons/icon-180.png',
  },
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  themeColor: '#060242',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={ubuntu.className}>
        <RegisterSW />
        {children}
      </body>
    </html>
  )
}
