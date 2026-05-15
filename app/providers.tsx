'use client'
import { ThemeProvider } from 'next-themes'
import { ToastContainer } from '@/components/ui/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
      <ToastContainer />
    </ThemeProvider>
  )
}
