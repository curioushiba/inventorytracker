"use client"

import React, { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
import { Textarea } from "@/components/ui/textarea"
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
import { Label } from "@/components/ui/label"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"

export interface MobileOptimizedInputProps extends Omit<InputProps, 'size'> {
  label?: string
  error?: string
  touchOptimized?: boolean
  showClearButton?: boolean
  onClear?: () => void
  size?: 'sm' | 'md' | 'lg'
}

export interface MobileOptimizedTextareaProps extends TextareaProps {
  label?: string
  error?: string
  touchOptimized?: boolean
  showClearButton?: boolean
  onClear?: () => void
  autoResize?: boolean
}

const sizeStyles = {
  sm: "h-10 text-sm",
  md: "h-12 text-base",
  lg: "h-14 text-lg",
}

export function MobileOptimizedInput({
  label,
  error,
  touchOptimized = true,
  showClearButton = true,
  onClear,
  className,
  size = 'md',
  onFocus,
  onBlur,
  value,
  ...props
}: MobileOptimizedInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { triggerSelectionHaptic } = useHapticFeedback()

  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    triggerSelectionHaptic()
    onFocus?.(event)
  }, [onFocus, triggerSelectionHaptic])

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    onBlur?.(event)
  }, [onBlur])

  const handleClear = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
    triggerSelectionHaptic()
    onClear?.()
  }, [onClear, triggerSelectionHaptic])

  const showClear = showClearButton && value && isFocused

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium text-foreground">
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          className={cn(
            "transition-all duration-200 touch-manipulation",
            sizeStyles[size],
            touchOptimized && [
              "min-h-[44px]", // WCAG minimum touch target
              "text-base",    // Prevent zoom on iOS
              "border-2",     // Thicker border for easier tapping
            ],
            isFocused && "border-primary ring-2 ring-primary/20",
            error && "border-destructive ring-2 ring-destructive/20",
            showClear && "pr-10",
            className
          )}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {/* Clear Button */}
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center touch-manipulation"
          >
            <span className="text-xs text-muted-foreground">✕</span>
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  )
}

export function MobileOptimizedTextarea({
  label,
  error,
  touchOptimized = true,
  showClearButton = true,
  onClear,
  autoResize = true,
  className,
  onFocus,
  onBlur,
  value,
  ...props
}: MobileOptimizedTextareaProps) {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { triggerSelectionHaptic } = useHapticFeedback()

  const handleFocus = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true)
    triggerSelectionHaptic()
    onFocus?.(event)
  }, [onFocus, triggerSelectionHaptic])

  const handleBlur = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false)
    onBlur?.(event)
  }, [onBlur])

  const handleClear = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.value = ''
      textareaRef.current.focus()
    }
    triggerSelectionHaptic()
    onClear?.()
  }, [onClear, triggerSelectionHaptic])

  // Auto resize functionality
  const handleInput = useCallback((event: React.FormEvent<HTMLTextAreaElement>) => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
    props.onInput?.(event)
  }, [autoResize, props])

  const showClear = showClearButton && value && isFocused

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium text-foreground">
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Textarea
          ref={textareaRef}
          className={cn(
            "transition-all duration-200 touch-manipulation resize-none",
            touchOptimized && [
              "min-h-[80px]", // Larger minimum height for touch
              "text-base",    // Prevent zoom on iOS
              "border-2",     // Thicker border for easier tapping
            ],
            isFocused && "border-primary ring-2 ring-primary/20",
            error && "border-destructive ring-2 ring-destructive/20",
            showClear && "pr-10",
            className
          )}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleInput}
          {...props}
        />
        
        {/* Clear Button */}
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center touch-manipulation"
          >
            <span className="text-xs text-muted-foreground">✕</span>
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  )
}