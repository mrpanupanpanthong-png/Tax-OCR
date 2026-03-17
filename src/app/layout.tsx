import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tax Report OCR Dashboard',
  description: 'AI-powered OCR extraction for tax invoices',
}

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ClientProvider } from '@/context/client-context'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <ClientProvider>
          <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-50">
            <Sidebar />
          </div>
          <main className="md:pl-72 w-full h-full flex flex-col overflow-hidden">
            <Header />
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </main>
        </ClientProvider>
      </body>
    </html>
  )
}
