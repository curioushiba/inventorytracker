"use client"

import { useMemo, useCallback, useState, useRef } from 'react'

interface OptimizedDataOptions {
  pageSize?: number
  cacheSize?: number
  sortKey?: string
  filterFn?: (item: any) => boolean
}

export function useOptimizedData<T>(
  data: T[],
  options: OptimizedDataOptions = {}
) {
  const {
    pageSize = 50,
    cacheSize = 200,
    sortKey,
    filterFn
  } = options

  const [currentPage, setCurrentPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const cache = useRef(new Map<string, T[]>())

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    const cacheKey = `${searchQuery}-${sortKey}-${JSON.stringify(filterFn?.toString())}`
    
    if (cache.current.has(cacheKey)) {
      return cache.current.get(cacheKey)!
    }

    let result = [...data]

    // Apply search filter
    if (searchQuery) {
      result = result.filter((item: any) =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }

    // Apply custom filter
    if (filterFn) {
      result = result.filter(filterFn)
    }

    // Apply sorting
    if (sortKey) {
      result.sort((a: any, b: any) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal)
        }
        
        return aVal - bVal
      })
    }

    // Manage cache size
    if (cache.current.size >= cacheSize) {
      const firstKey = cache.current.keys().next().value
      if (firstKey) {
        cache.current.delete(firstKey)
      }
    }

    cache.current.set(cacheKey, result)
    return result
  }, [data, searchQuery, sortKey, filterFn, cacheSize])

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = currentPage * pageSize
    const endIndex = startIndex + pageSize
    return processedData.slice(startIndex, endIndex)
  }, [processedData, currentPage, pageSize])

  // Pagination controls
  const totalPages = Math.ceil(processedData.length / pageSize)
  const hasNextPage = currentPage < totalPages - 1
  const hasPreviousPage = currentPage > 0

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasNextPage])

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1)
    }
  }, [hasPreviousPage])

  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])

  // Reset page when search changes
  const updateSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(0)
  }, [])

  // Memory cleanup
  const clearCache = useCallback(() => {
    cache.current.clear()
  }, [])

  return {
    data: paginatedData,
    totalItems: processedData.length,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
    searchQuery,
    updateSearch,
    clearCache
  }
}

// Hook for debounced search
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useMemo(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return debouncedValue
}

// Hook for measuring component performance
export function usePerformanceProfiler(name: string) {
  const startTime = useRef<number | undefined>(undefined)
  const measurements = useRef<number[]>([])

  const start = useCallback(() => {
    startTime.current = performance.now()
  }, [])

  const end = useCallback(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current
      measurements.current.push(duration)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
      }
      
      // Keep only last 10 measurements
      if (measurements.current.length > 10) {
        measurements.current.shift()
      }
    }
  }, [name])

  const getAverageTime = useCallback(() => {
    if (measurements.current.length === 0) return 0
    const sum = measurements.current.reduce((a, b) => a + b, 0)
    return sum / measurements.current.length
  }, [])

  return { start, end, getAverageTime }
}