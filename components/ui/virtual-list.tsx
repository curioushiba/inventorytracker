"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, start + visibleCount + overscan)
    }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }))
  }, [items, visibleRange.start, visibleRange.end])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Optimized inventory list component using virtual scrolling
export function VirtualInventoryList<T>({
  items,
  renderItem,
  className,
  searchQuery = '',
}: {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  searchQuery?: string
}) {
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items
    return items.filter((item: any) => 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [items, searchQuery])

  if (filteredItems.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="text-muted-foreground">
          {searchQuery ? 'No items match your search' : 'No items found'}
        </div>
      </div>
    )
  }

  // Use virtual scrolling for lists with more than 20 items
  if (filteredItems.length > 20) {
    return (
      <VirtualList
        items={filteredItems}
        itemHeight={120} // Approximate height of each item
        containerHeight={400} // Container height
        renderItem={renderItem}
        className={className}
        overscan={3}
      />
    )
  }

  // Render normally for smaller lists
  return (
    <div className={className}>
      {filteredItems.map((item, index) => renderItem(item, index))}
    </div>
  )
}