"use client"

import { useCallback } from "react"

export type HapticFeedbackType = 
  | 'light'
  | 'medium' 
  | 'heavy'
  | 'selection'
  | 'impact'
  | 'notification'

export interface HapticFeedbackOptions {
  pattern?: number[]
  duration?: number
}

export function useHapticFeedback() {
  const isHapticSupported = useCallback(() => {
    return (
      typeof window !== 'undefined' && 
      'navigator' in window && 
      'vibrate' in navigator
    )
  }, [])

  const triggerHaptic = useCallback((
    type: HapticFeedbackType = 'light',
    options: HapticFeedbackOptions = {}
  ) => {
    if (!isHapticSupported()) return

    try {
      // Use Web Vibration API patterns based on feedback type
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50],
        selection: [5, 5, 5],
        impact: [30, 10, 30],
        notification: [100, 30, 100, 30, 100]
      }

      const pattern = options.pattern || patterns[type]
      
      if (options.duration) {
        navigator.vibrate(options.duration)
      } else {
        navigator.vibrate(pattern)
      }
    } catch (error) {
      // Silently fail if haptic feedback isn't available
      console.debug('Haptic feedback not available:', error)
    }
  }, [isHapticSupported])

  const triggerSelectionHaptic = useCallback(() => {
    triggerHaptic('selection')
  }, [triggerHaptic])

  const triggerImpactHaptic = useCallback(() => {
    triggerHaptic('impact')
  }, [triggerHaptic])

  const triggerNotificationHaptic = useCallback(() => {
    triggerHaptic('notification')
  }, [triggerHaptic])

  const triggerSuccessHaptic = useCallback(() => {
    triggerHaptic('light', { pattern: [100, 50, 100] })
  }, [triggerHaptic])

  const triggerErrorHaptic = useCallback(() => {
    triggerHaptic('heavy', { pattern: [200, 50, 200, 50, 200] })
  }, [triggerHaptic])

  const triggerWarningHaptic = useCallback(() => {
    triggerHaptic('medium', { pattern: [150, 30, 150] })
  }, [triggerHaptic])

  return {
    isHapticSupported: isHapticSupported(),
    triggerHaptic,
    triggerSelectionHaptic,
    triggerImpactHaptic,
    triggerNotificationHaptic,
    triggerSuccessHaptic,
    triggerErrorHaptic,
    triggerWarningHaptic,
  }
}