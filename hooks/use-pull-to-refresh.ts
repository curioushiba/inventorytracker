"use client"

import { useCallback, useRef, useState, useEffect } from "react"

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number
  resistance?: number
  maxPullDistance?: number
  disabled?: boolean
}

export interface PullToRefreshState {
  isPulling: boolean
  isRefreshing: boolean
  pullDistance: number
  shouldRefresh: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  resistance = 2.5,
  maxPullDistance = 120,
  disabled = false,
}: PullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    shouldRefresh: false,
  })

  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const scrollElement = useRef<Element | null>(null)

  const canPull = useCallback(() => {
    if (disabled) return false
    if (!scrollElement.current) return true
    
    // Only allow pull-to-refresh when at the top of the scroll
    return scrollElement.current.scrollTop === 0
  }, [disabled])

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!canPull()) return
    
    const touch = event.touches[0]
    startY.current = touch.clientY
    currentY.current = touch.clientY
    
    // Find the scroll element
    let element = event.target as Element
    while (element && element !== document.body) {
      if (element.scrollHeight > element.clientHeight) {
        scrollElement.current = element
        break
      }
      element = element.parentElement as Element
    }
  }, [canPull])

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!canPull() || state.isRefreshing) return
    
    const touch = event.touches[0]
    currentY.current = touch.clientY
    
    const deltaY = currentY.current - startY.current
    
    if (deltaY > 0) {
      // Calculate pull distance with resistance
      const pullDistance = Math.min(
        deltaY / resistance,
        maxPullDistance
      )
      
      const shouldRefresh = pullDistance >= threshold
      
      setState(prev => ({
        ...prev,
        isPulling: true,
        pullDistance,
        shouldRefresh,
      }))
      
      // Prevent default scrolling when pulling
      if (pullDistance > 10) {
        event.preventDefault()
      }
    }
  }, [canPull, state.isRefreshing, resistance, maxPullDistance, threshold])

  const handleTouchEnd = useCallback(async (event: React.TouchEvent) => {
    if (!state.isPulling || state.isRefreshing) return
    
    if (state.shouldRefresh) {
      setState(prev => ({
        ...prev,
        isRefreshing: true,
        isPulling: false,
      }))
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('Pull to refresh error:', error)
      } finally {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0,
          shouldRefresh: false,
        }))
      }
    } else {
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        shouldRefresh: false,
      }))
    }
  }, [state.isPulling, state.isRefreshing, state.shouldRefresh, onRefresh])

  // Reset state when disabled changes
  useEffect(() => {
    if (disabled) {
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        shouldRefresh: false,
      })
    }
  }, [disabled])

  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }

  const resetRefresh = useCallback(() => {
    setState({
      isPulling: false,
      isRefreshing: false,
      pullDistance: 0,
      shouldRefresh: false,
    })
  }, [])

  return {
    ...state,
    touchHandlers,
    resetRefresh,
    progress: Math.min(state.pullDistance / threshold, 1),
  }
}