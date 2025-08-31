"use client"

import { useEffect, useCallback } from 'react'

/**
 * Hook to apply mobile performance optimizations
 */
export function useMobilePerformance() {
  useEffect(() => {
    // Disable smooth scrolling on mobile for better performance
    if ('ontouchstart' in window) {
      document.documentElement.style.scrollBehavior = 'auto'
    }

    // Add passive event listeners for better scroll performance
    const options = { passive: true }
    
    const handleTouchStart = () => {}
    const handleTouchMove = () => {}
    
    document.addEventListener('touchstart', handleTouchStart, options)
    document.addEventListener('touchmove', handleTouchMove, options)
    
    // Optimize animation frame rate on mobile
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        document.body.classList.add('mobile-optimized')
      })
    } else {
      setTimeout(() => {
        document.body.classList.add('mobile-optimized')
      }, 0)
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  // Debounced resize handler for responsive layouts
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout
    
    const handleResize = () => {
      document.body.classList.add('resizing')
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        document.body.classList.remove('resizing')
      }, 100)
    }
    
    window.addEventListener('resize', handleResize, { passive: true })
    
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
    }
  }, [])
}

/**
 * Hook to optimize heavy computations with requestIdleCallback
 */
export function useIdleCallback(callback: () => void, deps: React.DependencyList = []) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const handle = requestIdleCallback(callback)
      return () => cancelIdleCallback(handle)
    } else {
      const timer = setTimeout(callback, 0)
      return () => clearTimeout(timer)
    }
  }, deps)
}

/**
 * Hook to defer non-critical updates
 */
export function useDeferredUpdate<T>(value: T, delay: number = 200): T {
  const [deferredValue, setDeferredValue] = useState(value)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDeferredValue(value)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [value, delay])
  
  return deferredValue
}

// Missing import
import { useState } from 'react'