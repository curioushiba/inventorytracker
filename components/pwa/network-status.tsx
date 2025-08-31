'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showStatus, setShowStatus] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        setShowStatus(true)
        setTimeout(() => setShowStatus(false), 5000) // Hide after 5 seconds
      }
      setWasOffline(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      setShowStatus(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check connection periodically
    const checkConnection = setInterval(() => {
      fetch('/api/health', { method: 'HEAD' })
        .then(() => {
          if (!isOnline) handleOnline()
        })
        .catch(() => {
          if (isOnline) handleOffline()
        })
    }, 30000) // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(checkConnection)
    }
  }, [isOnline, wasOffline])

  if (!showStatus) return null

  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-50',
        'animate-slide-in-from-top'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full shadow-lg',
          'backdrop-blur-md border transition-all duration-300',
          isOnline
            ? 'bg-green-50/90 border-green-200 text-green-700'
            : 'bg-red-50/90 border-red-200 text-red-700'
        )}
      >
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">Back online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">You're offline</span>
          </>
        )}
      </div>
    </div>
  )
}

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg shadow-md border border-amber-200">
        <AlertCircle className="h-4 w-4" />
        <div className="text-sm">
          <p className="font-medium">Working offline</p>
          <p className="text-xs opacity-90">Changes will sync when reconnected</p>
        </div>
      </div>
    </div>
  )
}