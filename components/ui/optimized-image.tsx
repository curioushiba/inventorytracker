"use client"

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { useIntersectionObserver } from '@/components/performance/web-vitals'
import { Loader2 } from 'lucide-react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder,
  blurDataURL,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const imageRef = useRef<HTMLDivElement>(null)
  const isIntersecting = useIntersectionObserver(imageRef as React.RefObject<Element>, {
    rootMargin: '50px'
  })

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  // Generate optimized blur placeholder
  const defaultBlurDataURL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyLhFVQeGx8/wArmNx7x3x3kUqHCQEYCMOKKCkjJQqwMAqfDNh3PQBjBqP2MrxaV6kOl3jQ9APKV5/7BgFxFIsEhE3WEeNPDhgf4bMxEXbEjLODkA9zLCyW2PQFiJbUPb0wC9c7x1VJ9KMq5klb8eWN5RaJMRCYdOxhGKYFPJwfJOLfCjWO8BhMfgLbkGpIFrIQNYLhROKYcagTBJX/2Q=="

  return (
    <div ref={imageRef} className={`relative overflow-hidden ${className}`}>
      {(isIntersecting || priority) && !hasError ? (
        <>
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            priority={priority}
            placeholder={placeholder || 'blur'}
            blurDataURL={blurDataURL || defaultBlurDataURL}
            onLoad={handleLoad}
            onError={handleError}
            className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      ) : hasError ? (
        <div className="flex items-center justify-center bg-muted p-4 text-muted-foreground">
          Failed to load image
        </div>
      ) : (
        <div className="flex items-center justify-center bg-muted/30 animate-pulse" style={{ width, height }}>
          <div className="w-full h-full bg-muted/50 rounded" />
        </div>
      )}
    </div>
  )
}

// Preload critical images
export function preloadImage(src: string) {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    document.head.appendChild(link)
  }
}

// Generate responsive image sizes
export function generateImageSizes(breakpoints: { [key: string]: number }) {
  return Object.entries(breakpoints)
    .map(([breakpoint, size]) => `(max-width: ${breakpoint}px) ${size}vw`)
    .join(', ')
}