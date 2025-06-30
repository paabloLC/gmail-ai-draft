import type { Metadata } from 'next'
import { Overpass } from 'next/font/google'
import './globals.css'

const overpass = Overpass({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'GmailDraft - AI Email Assistant',
  description: 'AI-powered assistant that helps you respond to incoming emails automatically',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'GmailDraft - AI Email Assistant',
    description: 'AI-powered assistant that helps you respond to incoming emails automatically',
    url: 'https://gmaildraft.com',
    siteName: 'GmailDraft',
    images: [
      {
        url: '/assets/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GmailDraft - AI Email Assistant',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GmailDraft - AI Email Assistant',
    description: 'AI-powered assistant that helps you respond to incoming emails automatically',
    images: ['/assets/og-image.png'],
  },
}

import { AuthProvider } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={overpass.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}