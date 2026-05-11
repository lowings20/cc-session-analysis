import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Runsheet vs Actual',
  description: 'cc.abilitie.com session pacing analysis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
