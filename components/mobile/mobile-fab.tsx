"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"

export interface FABAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color?: string
  onAction: () => void
}

export interface MobileFABProps {
  actions?: FABAction[]
  onPrimaryAction?: () => void
  className?: string
  primaryIcon?: React.ComponentType<{ className?: string }>
  size?: 'sm' | 'md' | 'lg'
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
  expandDirection?: 'up' | 'left' | 'right'
}

const sizeStyles = {
  sm: "w-12 h-12",
  md: "w-14 h-14", 
  lg: "w-16 h-16",
}

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
}

const positionStyles = {
  'bottom-right': "bottom-4 right-4",
  'bottom-left': "bottom-4 left-4", 
  'bottom-center': "bottom-4 left-1/2 -translate-x-1/2",
}

export function MobileFAB({
  actions = [],
  onPrimaryAction,
  className,
  primaryIcon: PrimaryIcon = Plus,
  size = 'md',
  position = 'bottom-right',
  expandDirection = 'up',
}: MobileFABProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { triggerSelectionHaptic, triggerImpactHaptic } = useHapticFeedback()

  const handlePrimaryClick = () => {
    if (actions.length > 0) {
      triggerSelectionHaptic()
      setIsExpanded(!isExpanded)
    } else if (onPrimaryAction) {
      triggerImpactHaptic()
      onPrimaryAction()
    }
  }

  const handleActionClick = (action: FABAction) => {
    triggerImpactHaptic()
    setIsExpanded(false)
    action.onAction()
  }

  const getActionPosition = (index: number) => {
    const spacing = size === 'lg' ? 70 : size === 'md' ? 60 : 50
    
    switch (expandDirection) {
      case 'up':
        return { bottom: `${(index + 1) * spacing + 20}px` }
      case 'left':
        return { right: `${(index + 1) * spacing + 20}px` }
      case 'right':
        return { left: `${(index + 1) * spacing + 20}px` }
      default:
        return { bottom: `${(index + 1) * spacing + 20}px` }
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Action Buttons */}
      {isExpanded && actions.map((action, index) => (
        <div
          key={action.id}
          className="fixed z-50 flex items-center gap-3"
          style={{
            ...positionStyles[position].split(' ').reduce((acc, cls) => {
              if (cls.startsWith('bottom-')) acc.bottom = cls.replace('bottom-', '') === '4' ? '16px' : 'auto'
              if (cls.startsWith('right-')) acc.right = cls.replace('right-', '') === '4' ? '16px' : 'auto'
              if (cls.startsWith('left-')) acc.left = cls.replace('left-', '') === '4' ? '16px' : 'auto'
              return acc
            }, {} as Record<string, string>),
            ...getActionPosition(index),
            transform: position === 'bottom-center' ? 'translateX(-50%)' : undefined,
          }}
        >
          {/* Action Label */}
          {expandDirection !== 'right' && (
            <div className="bg-background/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border text-sm font-medium whitespace-nowrap">
              {action.label}
            </div>
          )}
          
          {/* Action Button */}
          <Button
            onClick={() => handleActionClick(action)}
            className={cn(
              "rounded-full shadow-lg border-2 border-background touch-manipulation transition-all duration-200 hover:scale-105 active:scale-95",
              sizeStyles[size],
              action.color || "bg-secondary hover:bg-secondary/90"
            )}
            size="icon"
          >
            <action.icon className={iconSizes[size]} />
          </Button>
          
          {/* Action Label (right side) */}
          {expandDirection === 'right' && (
            <div className="bg-background/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border text-sm font-medium whitespace-nowrap">
              {action.label}
            </div>
          )}
        </div>
      ))}

      {/* Main FAB */}
      <Button
        onClick={handlePrimaryClick}
        className={cn(
          "fixed z-50 rounded-full shadow-lg bg-primary hover:bg-primary/90 active:bg-primary/80 touch-manipulation transition-all duration-200 hover:scale-105 active:scale-95",
          sizeStyles[size],
          positionStyles[position],
          isExpanded && actions.length > 0 && "rotate-45",
          className
        )}
        size="icon"
      >
        {isExpanded && actions.length > 0 ? (
          <X className={iconSizes[size]} />
        ) : (
          <PrimaryIcon className={iconSizes[size]} />
        )}
      </Button>
    </>
  )
}