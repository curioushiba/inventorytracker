'use client'

import { useEffect, useState } from 'react'
import { X, Download, Smartphone, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [platform, setPlatform] = useState<'desktop' | 'mobile'>('desktop')

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if running on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
    setPlatform(isMobile ? 'mobile' : 'desktop')

    // Check localStorage to see if user has dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const dismissedTime = dismissed ? parseInt(dismissed) : 0
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    const handlePWAInstallable = (e: CustomEvent) => {
      const promptEvent = e.detail as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      
      // Show prompt if not recently dismissed
      if (!dismissed || dismissedTime < oneDayAgo) {
        setTimeout(() => setShowPrompt(true), 3000) // Show after 3 seconds
      }
    }

    const handlePWAInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    const handleAlreadyInstalled = () => {
      setIsInstalled(true)
    }

    // Listen to custom events from pwa-init.js
    window.addEventListener('pwa-installable', handlePWAInstallable as EventListener)
    window.addEventListener('pwa-installed', handlePWAInstalled)
    window.addEventListener('pwa-already-installed', handleAlreadyInstalled)

    // Check if there's already a prompt stored
    const existingPrompt = (window as any).getPWAPrompt?.()
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt)
      if (!dismissed || dismissedTime < oneDayAgo) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    return () => {
      window.removeEventListener('pwa-installable', handlePWAInstallable as EventListener)
      window.removeEventListener('pwa-installed', handlePWAInstalled)
      window.removeEventListener('pwa-already-installed', handleAlreadyInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in-from-bottom">
      <Card className="w-[380px] shadow-lg border-green-200 bg-white/95 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {platform === 'mobile' ? (
                <Smartphone className="h-6 w-6 text-green-600" />
              ) : (
                <Monitor className="h-6 w-6 text-green-600" />
              )}
              <div>
                <CardTitle className="text-lg">Install Inventory Tracker</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Get the full app experience
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 -mt-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Work offline with cached data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Quick access from your {platform === 'mobile' ? 'home screen' : 'desktop'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Native app-like experience</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleInstall} 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              className="flex-1"
            >
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}