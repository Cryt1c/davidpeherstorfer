import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import 'katex/dist/katex.min.css'
import './globals.css'
import siteMetadata from '@/data/siteMetadata'
import { ThemeProviders } from './theme-providers'
import Analytics from '@/components/analytics'
import LayoutWrapper from '@/components/LayoutWrapper'
import { TrackingProvider } from '@/components/three-d/tracking-context'
import TrackingController from '@/components/three-d/TrackingController'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: siteMetadata.title,
  description: siteMetadata.description,
  icons: {
    icon: [
      { url: '/static/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/static/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/static/favicons/apple-touch-icon.png', sizes: '76x76' }],
    other: [
      {
        rel: 'mask-icon',
        url: '/static/favicons/safari-pinned-tab.svg',
        color: '#5bbad5',
      },
    ],
  },
  manifest: '/static/favicons/site.webmanifest',
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  other: {
    'msapplication-TileColor': '#000000',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`} suppressHydrationWarning>
      <body className="antialiased overflow-x-clip text-black bg-white dark:bg-gray-900 dark:text-white">
        <ThemeProviders>
          <Analytics />
          <TrackingProvider>
            <TrackingController />
            <LayoutWrapper>{children}</LayoutWrapper>
          </TrackingProvider>
        </ThemeProviders>
      </body>
    </html>
  )
}
