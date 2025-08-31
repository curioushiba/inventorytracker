'use client'

import { useEffect, useState } from 'react'
import { useOffline } from '@/contexts/offline-context'
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SyncStatus() {
  const { isOffline, syncStatus, syncNow } = useOffline()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (syncStatus) {
      setIsVisible(true)
      
      // Auto-hide success messages after 3 seconds
      if (syncStatus.status === 'synced') {
        const timer = setTimeout(() => setIsVisible(false), 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [syncStatus])

  if (!isVisible && !isOffline) return null

  const getIcon = () => {
    if (isOffline) return <CloudOff className="h-4 w-4" />
    
    switch (syncStatus?.status) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'synced':
        return <Check className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Cloud className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    if (isOffline) return 'bg-orange-500'
    
    switch (syncStatus?.status) {
      case 'syncing':
        return 'bg-blue-500'
      case 'synced':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getMessage = () => {
    if (isOffline) return 'Working offline'
    return syncStatus?.message || 'Ready'
  }

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-white rounded-lg shadow-lg transition-all duration-300',
          getStatusColor(),
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        )}
      >
        {getIcon()}
        <span className="text-sm font-medium">{getMessage()}</span>
        
        {syncStatus?.status === 'error' && (
          <button
            onClick={syncNow}
            className="ml-2 text-xs underline hover:no-underline"
          >
            Retry
          </button>
        )}
        
        {syncStatus?.status === 'synced' && syncStatus.itemsCount !== undefined && (
          <span className="text-xs opacity-75">
            ({syncStatus.itemsCount} items)
          </span>
        )}
      </div>
    </div>
  )
}

export function OfflineBadge() {
  const { isOffline, cachedItems, cachedCategories } = useOffline()

  if (!isOffline) return null

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-medium">
      <CloudOff className="h-3 w-3" />
      <span>Offline Mode</span>
      <span className="opacity-75">
        ({cachedItems.length} cached items)
      </span>
    </div>
  )
}