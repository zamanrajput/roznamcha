import type { Metadata } from 'next'
import { Baloo_Bhaijaan_2, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const baloo = Baloo_Bhaijaan_2({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-baloo',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Roznamcha — Bhatti Mobile Center',
  description: 'Daily shop ledger for Bhatti Mobile Center',
  manifest: '/manifest.json',
  themeColor: '#f0a500',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Roznamcha',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${baloo.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  )
}
