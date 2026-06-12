import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "MoneyOps",
  description: "Buget personal PWA pentru un singur utilizator în beta.",
  manifest: "/manifest.webmanifest",
}

export const viewport: Viewport = {
  themeColor: "#060b10",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="ro" className={`${geistSans.variable} ${geistMono.variable} dark h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
