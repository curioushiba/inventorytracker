"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useTouchGestures } from "@/hooks/use-touch-gestures"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createPortal } from "react-dom"

export interface MobileSheetProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  snapPoints?: number[] // Percentage heights [0.3, 0.6, 0.9]
  initialSnap?: number
  allowDismiss?: boolean
  className?: string
  contentClassName?: string
  showHandle?: boolean
}

export function MobileSheet({
  children,
  isOpen,
  onClose,
  title,
  description,
  snapPoints = [0.5, 0.9],
  initialSnap = 1,
  allowDismiss = true,
  className,
  contentClassName,
  showHandle = true,
}: MobileSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap)
  const [isDragging, setIsDragging] = useState(false)
  const [dragY, setDragY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number>(0)
  const { triggerSelectionHaptic, triggerImpactHaptic } = useHapticFeedback()

  const currentSnapHeight = snapPoints[currentSnap] || snapPoints[snapPoints.length - 1]

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0]
    startYRef.current = touch.clientY
    setIsDragging(true)
    triggerSelectionHaptic()
  }, [triggerSelectionHaptic])

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isDragging) return

    const touch = event.touches[0]
    const deltaY = touch.clientY - startYRef.current
    
    // Only allow downward dragging
    if (deltaY < 0) return
    
    setDragY(deltaY)
    
    // Prevent body scroll while dragging
    event.preventDefault()
  }, [isDragging])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)
    
    const threshold = window.innerHeight * 0.1 // 10% of screen height
    
    if (dragY > threshold) {
      if (currentSnap > 0) {
        // Snap to lower snap point
        setCurrentSnap(currentSnap - 1)
        triggerSelectionHaptic()
      } else if (allowDismiss) {
        // Close sheet
        triggerImpactHaptic()
        onClose()
      }
    }
    
    setDragY(0)
  }, [isDragging, dragY, currentSnap, allowDismiss, onClose, triggerSelectionHaptic, triggerImpactHaptic])

  const handleBackdropClick = useCallback(() => {
    if (allowDismiss) {
      triggerImpactHaptic()
      onClose()
    }
  }, [allowDismiss, onClose, triggerImpactHaptic])

  const handleClose = useCallback(() => {
    triggerImpactHaptic()
    onClose()
  }, [onClose, triggerImpactHaptic])

  // Reset to initial snap when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentSnap(initialSnap)
      setDragY(0)
    }
  }, [isOpen, initialSnap])

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const sheetHeight = isDragging 
    ? Math.max(0, (currentSnapHeight * window.innerHeight) - dragY)
    : currentSnapHeight * window.innerHeight

  const content = (
    <div className={cn("fixed inset-0 z-50", className)}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-xl shadow-2xl transition-all duration-300 ease-out touch-none"
        style={{
          height: `${sheetHeight}px`,
          transform: isDragging ? 'none' : undefined,
        }}
      >
        {/* Handle */}
        {showHandle && (
          <div
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-manipulation"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || description) && (
          <div className="px-6 py-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                {title && (
                  <h2 className="text-lg font-semibold text-foreground truncate">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {description}
                  </p>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="ml-4 h-8 w-8 p-0 shrink-0 touch-manipulation"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={cn(
          "flex-1 overflow-y-auto overscroll-contain",
          "pb-safe-bottom", // Safe area for devices with home indicator
          contentClassName
        )}>
          {children}
        </div>

        {/* Snap Point Indicators */}
        {snapPoints.length > 1 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            {snapPoints.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentSnap(index)
                  triggerSelectionHaptic()
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors touch-manipulation",
                  currentSnap === index ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}