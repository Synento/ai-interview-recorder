import type { Metadata } from 'next'
import { KeyBanner } from '@/components/key-banner'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  description: 'Record a 1:1 interview with Synento, then replay it and export an MP4.',
  title: 'AI interview recorder',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          <KeyBanner />
          {children}
        </main>
      </body>
    </html>
  )
}
