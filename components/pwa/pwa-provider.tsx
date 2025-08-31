'use client'

import { InstallPrompt } from './install-prompt'
import { NetworkStatus, OfflineIndicator } from './network-status'
import { UpdateBanner } from './update-banner'
import { SyncStatus } from './sync-status'
import { OfflineProvider } from '@/contexts/offline-context'

export function PWAProvider({ children }: { children: React.ReactNode }) {
  return (
    <OfflineProvider>
      {children}
      <InstallPrompt />
      <NetworkStatus />
      <OfflineIndicator />
      <UpdateBanner />
      <SyncStatus />
    </OfflineProvider>
  )
}