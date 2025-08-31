"use client"

import { useCallback, useRef, useState } from "react"

export interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down'
  distance: number
  velocity: number
  duration: number
}

export interface UseTouchGesturesOptions {
  onSwipe?: (gesture: SwipeGesture) => void
  onLongPress?: (point: TouchPoint) => void
  onTap?: (point: TouchPoint) => void
  onDoubleTap?: (point: TouchPoint) => void
  minSwipeDistance?: number
  maxTapDistance?: number
  longPressDelay?: number
  doubleTapDelay?: number
}

export function useTouchGestures({
  onSwipe,
  onLongPress,
  onTap,
  onDoubleTap,
  minSwipeDistance = 50,
  maxTapDistance = 10,
  longPressDelay = 500,
  doubleTapDelay = 300,
}: UseTouchGesturesOptions = {}) {
  const touchStartRef = useRef<TouchPoint | null>(null)
  const touchEndRef = useRef<TouchPoint | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<TouchPoint | null>(null)
  const [isLongPressing, setIsLongPressing] = useState(false)

  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
    }
  }, [])

  const getDistance = useCallback((point1: TouchPoint, point2: TouchPoint) => {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    )
  }, [])

  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): SwipeGesture['direction'] => {
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }, [])

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    clearTimers()
    
    const touch = event.touches[0]
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    }
    
    touchStartRef.current = touchPoint
    setIsLongPressing(false)

    // Start long press detection
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressing(true)
        onLongPress(touchPoint)
      }, longPressDelay)
    }
  }, [onLongPress, longPressDelay, clearTimers])

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = event.touches[0]
    const currentPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    }

    const distance = getDistance(touchStartRef.current, currentPoint)
    
    // Cancel long press if moved too much
    if (distance > maxTapDistance && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
      setIsLongPressing(false)
    }
  }, [getDistance, maxTapDistance])

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    clearTimers()
    
    if (!touchStartRef.current) return

    const touch = event.changedTouches[0]
    const touchEnd: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    }
    
    touchEndRef.current = touchEnd

    const distance = getDistance(touchStartRef.current, touchEnd)
    const duration = touchEnd.timestamp - touchStartRef.current.timestamp
    const velocity = distance / duration

    // Handle swipe gesture
    if (distance >= minSwipeDistance && onSwipe) {
      const direction = getSwipeDirection(touchStartRef.current, touchEnd)
      onSwipe({
        direction,
        distance,
        velocity,
        duration,
      })
    } 
    // Handle tap gestures (only if not long pressing and didn't move much)
    else if (distance <= maxTapDistance && !isLongPressing) {
      // Check for double tap
      if (lastTapRef.current && onDoubleTap) {
        const timeSinceLastTap = touchEnd.timestamp - lastTapRef.current.timestamp
        const distanceBetweenTaps = getDistance(lastTapRef.current, touchEnd)
        
        if (timeSinceLastTap <= doubleTapDelay && distanceBetweenTaps <= maxTapDistance) {
          onDoubleTap(touchEnd)
          lastTapRef.current = null
          return
        }
      }
      
      // Single tap
      if (onTap) {
        tapTimerRef.current = setTimeout(() => {
          onTap(touchEnd)
        }, onDoubleTap ? doubleTapDelay : 0)
      }
      
      lastTapRef.current = touchEnd
    }

    setIsLongPressing(false)
    touchStartRef.current = null
  }, [
    clearTimers,
    getDistance,
    getSwipeDirection,
    minSwipeDistance,
    maxTapDistance,
    doubleTapDelay,
    isLongPressing,
    onSwipe,
    onTap,
    onDoubleTap,
  ])

  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }

  return {
    touchHandlers,
    isLongPressing,
  }
}