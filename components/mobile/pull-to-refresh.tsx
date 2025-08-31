"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"
import { Loader2, ArrowDown } from "lucide-react"

export interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void> | void
  className?: string
  threshold?: number
  disabled?: boolean
  pullIndicatorColor?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  className,
  threshold = 70,
  disabled = false,
  pullIndicatorColor = "text-primary",
}: PullToRefreshProps) {
  const {
    isPulling,
    isRefreshing,
    pullDistance,
    shouldRefresh,
    progress,
    touchHandlers,
  } = usePullToRefresh({
    onRefresh,
    threshold,
    disabled,
  })

  const indicatorOpacity = Math.min(progress, 1)
  const indicatorScale = 0.7 + (0.3 * progress)
  const rotateArrow = progress * 180

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Pull Indicator */}
      <div
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance - 50}px)`,
          opacity: indicatorOpacity,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full bg-background shadow-lg border transition-all duration-200",
            pullIndicatorColor
          )}
          style={{
            transform: `scale(${indicatorScale})`,
          }}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowDown
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                shouldRefresh && "text-green-500"
              )}
              style={{
                transform: `rotate(${rotateArrow}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Refresh Status Text */}
      {(isPulling || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center pt-16 pb-4 text-sm font-medium text-muted-foreground transition-all duration-200"
          style={{
            transform: `translateY(${pullDistance - 30}px)`,
            opacity: indicatorOpacity * 0.8,
          }}
        >
          {isRefreshing
            ? "Refreshing..."
            : shouldRefresh
            ? "Release to refresh"
            : "Pull to refresh"}
        </div>
      )}

      {/* Main Content */}
      <div
        className="relative z-10 transition-transform duration-200 ease-out"
        style={{
          transform: isPulling && !isRefreshing ? `translateY(${pullDistance * 0.5}px)` : undefined,
        }}
        {...touchHandlers}
      >
        {children}
      </div>

      {/* Background overlay while pulling */}
      {isPulling && (
        <div
          className="absolute inset-0 bg-muted/20 transition-opacity duration-200"
          style={{ opacity: indicatorOpacity * 0.1 }}
        />
      )}
    </div>
  )
}