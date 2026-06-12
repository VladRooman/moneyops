"use client"

import { FinanceApp } from "@/components/finance-app"
import { PwaRegister } from "@/components/pwa-register"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { type FinanceState } from "@/lib/finance"

export function AppShell({ initialState }: { initialState: FinanceState }) {
  return (
    <ThemeProvider>
      <PwaRegister />
      <FinanceApp initialState={initialState} />
      <Toaster richColors closeButton position="top-center" />
    </ThemeProvider>
  )
}
