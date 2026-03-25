import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DeltaCash | SME Liquidity Orchestration',
  description: 'Semi-autonomous liquidity orchestration system for SMEs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary/30">
        <div className="relative flex min-h-screen flex-col">
          {/* Subtle background glow effect */}
          <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-20 animate-pulse-slow"></div>
            <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-secondary/30 rounded-full blur-[150px] opacity-20"></div>
          </div>
          {children}
        </div>
      </body>
    </html>
  )
}
