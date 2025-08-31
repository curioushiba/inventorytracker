"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface MobileContainerProps {
  children: React.ReactNode
  className?: string
  safeArea?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  scrollable?: boolean
  centerContent?: boolean
}

const maxWidthStyles = {
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full",
}

const paddingStyles = {
  none: "",
  sm: "px-4 py-2",
  md: "px-6 py-4",
  lg: "px-8 py-6",
}

export function MobileContainer({
  children,
  className,
  safeArea = true,
  maxWidth = 'full',
  padding = 'md',
  scrollable = true,
  centerContent = false,
}: MobileContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto",
        maxWidthStyles[maxWidth],
        paddingStyles[padding],
        safeArea && [
          "pt-safe-top",    // Safe area top for status bar
          "pb-safe-bottom", // Safe area bottom for home indicator
          "pl-safe-left",   // Safe area left for notch
          "pr-safe-right",  // Safe area right for notch
        ],
        scrollable && "overflow-y-auto overscroll-contain",
        centerContent && "flex flex-col items-center justify-center min-h-screen",
        className
      )}
    >
      {children}
    </div>
  )
}