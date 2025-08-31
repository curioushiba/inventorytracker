'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function UpdateBanner() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleServiceWorkerUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!reg) return

        setRegistration(reg)

        // Check for updates on load
        reg.update()

        // Listen for new service worker waiting
        const handleStateChange = () => {
          if (reg.waiting) {
            setShowUpdateBanner(true)
          }
        }

        // Check if there's already a waiting worker
        if (reg.waiting) {
          setShowUpdateBanner(true)
        }

        // Listen for new workers
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', handleStateChange)
          }
        })

        // Listen for controller changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })
      } catch (error) {
        console.error('Error checking for service worker updates:', error)
      }
    }

    handleServiceWorkerUpdate()

    // Check for updates every hour
    const interval = setInterval(() => {
      if (registration) {
        registration.update()
      }
    }, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [registration])

  const handleUpdate = () => {
    if (!registration?.waiting) return

    // Tell the waiting service worker to activate
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    
    // The page will reload when the new service worker takes control
    setShowUpdateBanner(false)
  }

  const handleDismiss = () => {
    setShowUpdateBanner(false)
    // Show again in 4 hours
    setTimeout(() => {
      if (registration?.waiting) {
        setShowUpdateBanner(true)
      }
    }, 4 * 60 * 60 * 1000)
  }

  if (!showUpdateBanner) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-from-top">
      <Alert className="w-[400px] border-blue-200 bg-blue-50/95 backdrop-blur">
        <RefreshCw className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Update Available</AlertTitle>
        <AlertDescription className="text-blue-700">
          A new version of Inventory Tracker is available with improvements and bug fixes.
        </AlertDescription>
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            onClick={handleUpdate}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Update Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDismiss}
            className="border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            Later
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-blue-600 hover:text-blue-700"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  )
}