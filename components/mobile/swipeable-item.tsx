"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useTouchGestures } from "@/hooks/use-touch-gestures"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { Edit2, Trash2, Archive, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface SwipeAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: 'destructive' | 'warning' | 'primary' | 'secondary'
  onAction: () => void
}

export interface SwipeableItemProps {
  children: React.ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
  disabled?: boolean
  swipeThreshold?: number
  actionThreshold?: number
}

const actionColorStyles = {
  destructive: "bg-destructive text-destructive-foreground",
  warning: "bg-orange-500 text-white",
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
}

export function SwipeableItem({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  className,
  disabled = false,
  swipeThreshold = 50,
  actionThreshold = 80,
}: SwipeableItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isRevealing, setIsRevealing] = useState(false)
  const [revealedSide, setRevealedSide] = useState<'left' | 'right' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)
  
  const { triggerSelectionHaptic, triggerImpactHaptic } = useHapticFeedback()

  const resetPosition = useCallback(() => {
    setSwipeOffset(0)
    setIsRevealing(false)
    setRevealedSide(null)
  }, [])

  const executeAction = useCallback((action: SwipeAction) => {
    triggerImpactHaptic()
    resetPosition()
    action.onAction()
  }, [triggerImpactHaptic, resetPosition])

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (disabled) return
    
    const touch = event.touches[0]
    startXRef.current = touch.clientX
    isDraggingRef.current = true
    setIsRevealing(true)
  }, [disabled])

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isDraggingRef.current || disabled) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - startXRef.current
    
    // Determine which actions are available
    const hasLeftActions = leftActions.length > 0
    const hasRightActions = rightActions.length > 0
    
    // Constrain swipe based on available actions
    let newOffset = deltaX
    if (deltaX > 0 && !hasLeftActions) newOffset = 0
    if (deltaX < 0 && !hasRightActions) newOffset = 0
    
    // Apply some resistance for better feel
    const maxSwipe = hasLeftActions || hasRightActions ? 120 : 0
    if (Math.abs(newOffset) > maxSwipe) {
      newOffset = newOffset > 0 ? maxSwipe : -maxSwipe
    }
    
    setSwipeOffset(newOffset)
    
    // Trigger haptic feedback when crossing thresholds
    const absOffset = Math.abs(newOffset)
    if (absOffset === swipeThreshold || absOffset === actionThreshold) {
      triggerSelectionHaptic()
    }
    
    // Update revealed side
    if (newOffset > swipeThreshold) {
      setRevealedSide('left')
    } else if (newOffset < -swipeThreshold) {
      setRevealedSide('right')
    } else {
      setRevealedSide(null)
    }
    
    // Prevent scrolling while swiping
    if (Math.abs(newOffset) > 10) {
      event.preventDefault()
    }
  }, [disabled, leftActions.length, rightActions.length, swipeThreshold, actionThreshold, triggerSelectionHaptic])

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!isDraggingRef.current || disabled) return

    isDraggingRef.current = false
    const absOffset = Math.abs(swipeOffset)
    
    if (absOffset >= actionThreshold) {
      // Execute default action if threshold is met
      if (swipeOffset > 0 && onSwipeLeft) {
        onSwipeLeft()
        triggerImpactHaptic()
      } else if (swipeOffset < 0 && onSwipeRight) {
        onSwipeRight()
        triggerImpactHaptic()
      }
      resetPosition()
    } else if (absOffset >= swipeThreshold) {
      // Keep actions revealed
      const snapOffset = swipeOffset > 0 ? 80 : -80
      setSwipeOffset(snapOffset)
    } else {
      // Snap back to center
      resetPosition()
    }
  }, [disabled, swipeOffset, actionThreshold, swipeThreshold, onSwipeLeft, onSwipeRight, triggerImpactHaptic, resetPosition])

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        resetPosition()
      }
    }

    if (revealedSide) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [revealedSide, resetPosition])

  const renderActions = (actions: SwipeAction[], side: 'left' | 'right') => (
    <div
      className={cn(
        "absolute top-0 h-full flex items-center",
        side === 'left' ? "left-full" : "right-full"
      )}
    >
      {actions.map((action, index) => (
        <Button
          key={action.id}
          onClick={() => executeAction(action)}
          variant="ghost"
          size="sm"
          className={cn(
            "h-full min-w-[60px] rounded-none border-none flex flex-col items-center justify-center gap-1 px-3",
            actionColorStyles[action.color]
          )}
        >
          <action.icon className="h-4 w-4" />
          <span className="text-xs font-medium">{action.label}</span>
        </Button>
      ))}
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden touch-pan-y",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left Actions */}
      {leftActions.length > 0 && renderActions(leftActions, 'left')}
      
      {/* Right Actions */}
      {rightActions.length > 0 && renderActions(rightActions, 'right')}
      
      {/* Main Content */}
      <div
        className={cn(
          "relative z-10 bg-background transition-transform",
          isRevealing ? "duration-75" : "duration-200 ease-out"
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Preset action configurations
export const presetActions = {
  edit: (onEdit: () => void): SwipeAction => ({
    id: 'edit',
    label: 'Edit',
    icon: Edit2,
    color: 'primary',
    onAction: onEdit,
  }),
  
  delete: (onDelete: () => void): SwipeAction => ({
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    color: 'destructive',
    onAction: onDelete,
  }),
  
  archive: (onArchive: () => void): SwipeAction => ({
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    color: 'warning',
    onAction: onArchive,
  }),
  
  more: (onMore: () => void): SwipeAction => ({
    id: 'more',
    label: 'More',
    icon: MoreHorizontal,
    color: 'secondary',
    onAction: onMore,
  }),
}