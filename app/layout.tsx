import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { InventoryProvider } from "@/contexts/inventory-context"
import { PWAProvider } from "@/components/pwa/pwa-provider"
import { OfflineProvider } from "@/contexts/offline-context"
import { NotificationProvider } from "@/components/notifications/notification-provider"
import { PerformanceWrapper } from "@/components/performance/performance-wrapper"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["400", "500", "600"],
  fallback: ["Arial", "sans-serif"],
  preload: true,
})

export const metadata: Metadata = {
  title: "Inventory Tracker - Business Storage Management",
  description: "Professional inventory tracking and management system for your business storage room",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Inventory Tracker",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Inventory Tracker",
    description: "Professional inventory tracking and management system",
    siteName: "Inventory Tracker",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inventory Tracker",
    description: "Professional inventory tracking and management system",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#42a855",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${montserrat.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <PerformanceWrapper>
            <OfflineProvider>
              <InventoryProvider>
                <NotificationProvider>
                  <PWAProvider>{children}</PWAProvider>
                </NotificationProvider>
              </InventoryProvider>
            </OfflineProvider>
          </PerformanceWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}
