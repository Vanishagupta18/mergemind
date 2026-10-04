import type { Metadata } from "next"
import { Geist, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/app/app-shell"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" })

export const metadata: Metadata = {
  title: "MergeMind — AI PR Review",
  description: "AI-powered GitHub Pull Request review platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${jetbrains.variable} min-h-screen bg-canvas text-ink antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
