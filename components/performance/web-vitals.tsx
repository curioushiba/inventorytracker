"use client"

import { useEffect, useState } from 'react'
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

interface PerformanceMetric {
  name: string
  value: number
  id: string
  navigationType?: string
}

// Custom hook for tracking Web Vitals
export function useWebVitals(onMetric?: (metric: PerformanceMetric) => void) {
  useEffect(() => {
    const handleMetric = (metric: PerformanceMetric) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Web Vitals] ${metric.name}:`, {
          value: metric.value,
          rating: getMetricRating(metric.name, metric.value),
          id: metric.id
        })
      }
      
      // Send to analytics or custom handler
      if (onMetric) {
        onMetric(metric)
      }
      
      // Send to analytics services (example)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', metric.name, {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          non_interaction: true
        })
      }
    }

    // Track all Core Web Vitals
    onCLS(handleMetric)
    onINP(handleMetric) // INP replaced FID in web-vitals v4
    onFCP(handleMetric)
    onLCP(handleMetric)
    onTTFB(handleMetric)
  }, [onMetric])
}

// Get performance rating based on thresholds
function getMetricRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = {
    CLS: [0.1, 0.25],
    INP: [200, 500], // INP replaced FID
    LCP: [2500, 4000],
    FCP: [1800, 3000],
    TTFB: [800, 1800]
  }
  
  const [good, poor] = thresholds[name as keyof typeof thresholds] || [0, 0]
  
  if (value <= good) return 'good'
  if (value <= poor) return 'needs-improvement'
  return 'poor'
}

// Component for displaying performance metrics in development
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  
  useWebVitals((metric) => {
    setMetrics(prev => [...prev.filter(m => m.name !== metric.name), metric])
  })
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-xs">
      <h2 className="font-bold mb-2">Web Vitals</h2>
      {metrics.map(metric => (
        <div key={metric.name} className="flex justify-between items-center mb-1">
          <span>{metric.name}:</span>
          <span className={`px-2 py-1 rounded ${
            getMetricRating(metric.name, metric.value) === 'good' 
              ? 'bg-green-600' 
              : getMetricRating(metric.name, metric.value) === 'needs-improvement'
              ? 'bg-yellow-600'
              : 'bg-red-600'
          }`}>
            {metric.name === 'CLS' 
              ? metric.value.toFixed(3)
              : Math.round(metric.value)}
            {metric.name !== 'CLS' && 'ms'}
          </span>
        </div>
      ))}
    </div>
  )
}

// Performance-aware intersection observer hook
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  
  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options
      }
    )
    
    observer.observe(element)
    
    return () => observer.disconnect()
  }, [elementRef, options])
  
  return isIntersecting
}

// Custom hook for lazy loading images with performance tracking
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null)
  const isIntersecting = useIntersectionObserver({ current: imageRef as Element })
  
  useEffect(() => {
    if (isIntersecting && src && imageSrc !== src) {
      const img = new Image()
      
      const startTime = performance.now()
      
      img.onload = () => {
        const loadTime = performance.now() - startTime
        setImageSrc(src)
        
        // Track image load performance
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Image Load] ${src}: ${Math.round(loadTime)}ms`)
        }
      }
      
      img.onerror = () => {
        console.error(`[Image Load Error] ${src}`)
      }
      
      img.src = src
    }
  }, [isIntersecting, src, imageSrc])
  
  return { imageSrc, setImageRef }
}

