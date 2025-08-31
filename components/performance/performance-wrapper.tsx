"use client"

import { useWebVitals, PerformanceMonitor } from './web-vitals'

export function PerformanceWrapper({ children }: { children: React.ReactNode }) {
  // Track Web Vitals for the entire app
  useWebVitals()
  
  return (
    <>
      {children}
      <PerformanceMonitor />
    </>
  )
}