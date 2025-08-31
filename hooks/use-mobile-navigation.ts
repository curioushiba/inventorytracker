"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export interface SwipeBackGestureOptions {
  enabled?: boolean
  threshold?: number
  edgeSize?: number
}

export function useMobileNavigation({
  enabled = true,
  threshold = 50,
  edgeSize = 20,
}: SwipeBackGestureOptions = {}) {
  const router = useRouter()
  const [isSwipingBack, setIsSwipingBack] = useState(false)
  const [swipeProgress, setSwipeProgress] = useState(0)
  const startXRef = useRef<number>(0)
  const isEdgeSwipeRef = useRef<boolean>(false)

  const canSwipeBack = useCallback(() => {
    if (!enabled) return false
    
    // Check if we can go back in history
    return window.history.length > 1
  }, [enabled])

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!canSwipeBack()) return

    const touch = event.touches[0]
    startXRef.current = touch.clientX
    
    // Check if touch started from the edge
    isEdgeSwipeRef.current = touch.clientX <= edgeSize
  }, [canSwipeBack, edgeSize])

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!canSwipeBack() || !isEdgeSwipeRef.current) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - startXRef.current
    
    // Only process right swipes from the left edge
    if (deltaX > 0) {
      const progress = Math.min(deltaX / threshold, 1)
      setSwipeProgress(progress)
      
      if (!isSwipingBack && deltaX > 10) {
        setIsSwipingBack(true)
      }
      
      // Prevent default behavior when actively swiping back
      if (isSwipingBack) {
        event.preventDefault()
      }
    }
  }, [canSwipeBack, threshold, isSwipingBack])

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!isSwipingBack) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - startXRef.current
    
    if (deltaX >= threshold) {
      // Trigger back navigation
      router.back()
    }
    
    // Reset state
    setIsSwipingBack(false)
    setSwipeProgress(0)
    isEdgeSwipeRef.current = false
  }, [isSwipingBack, threshold, router])

  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }

  return {
    touchHandlers,
    isSwipingBack,
    swipeProgress,
    canSwipeBack: canSwipeBack(),
  }
}