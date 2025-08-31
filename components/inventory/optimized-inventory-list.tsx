"use client"

import React, { useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { VirtualInventoryList } from "@/components/ui/virtual-list"
import { useOptimizedData, useDebounce, usePerformanceProfiler } from "@/hooks/use-optimized-data"
import { useInventory } from "@/contexts/inventory-context"
import { Package, Edit2, Search } from "lucide-react"

interface InventoryItem {
  id: string
  name: string
  description?: string
  category: string
  quantity: number
  minQuantity: number
  location?: string
  lastUpdated: string
}

interface OptimizedInventoryListProps {
  onEditItem?: (itemId: string) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export function OptimizedInventoryList({ 
  onEditItem, 
  searchQuery = '', 
  onSearchChange 
}: OptimizedInventoryListProps) {
  const { items, isLoading } = useInventory()
  const profiler = usePerformanceProfiler('InventoryList')
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Optimized data management with pagination and caching
  const {
    data: paginatedItems,
    totalItems,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    updateSearch
  } = useOptimizedData<InventoryItem>(items, {
    pageSize: 20,
    cacheSize: 100,
    sortKey: 'name',
    filterFn: debouncedSearch ? (item: InventoryItem) =>
      item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (item.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false)
      : undefined
  })

  // Memoized item renderer for better performance
  const renderItem = useCallback((item: InventoryItem, index: number) => {
    const isLowStock = item.minQuantity > 0 && item.quantity <= item.minQuantity

    return (
      <div 
        key={item.id} 
        className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-accent/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
            <Badge variant="secondary" className="text-xs font-medium shrink-0">
              {item.category || "Uncategorized"}
            </Badge>
            {isLowStock && (
              <Badge variant="destructive" className="text-xs shrink-0">
                Low Stock
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
              {item.description}
            </p>
          )}
          {item.location && (
            <p className="text-xs text-muted-foreground truncate">
              📍 {item.location}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4 shrink-0">
          <div className="text-right">
            <div className="text-xl font-bold text-foreground">{item.quantity}</div>
            <div className="text-xs text-muted-foreground">units</div>
          </div>
          {onEditItem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditItem(item.id)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }, [onEditItem])

  // Handle search updates
  const handleSearchChange = useCallback((value: string) => {
    updateSearch(value)
    onSearchChange?.(value)
  }, [updateSearch, onSearchChange])

  // Performance measurement
  React.useEffect(() => {
    profiler.start()
    return () => profiler.end()
  }, [paginatedItems, profiler])

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-primary" />
            <span>Inventory Items ({totalItems})</span>
          </CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {paginatedItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-gradient-to-br from-muted to-muted/50 p-6 rounded-2xl inline-block mb-4">
              <Package className="h-16 w-16 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'No items match your search' : 'No items yet'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Start building your inventory by adding your first item'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="p-4">
              <VirtualInventoryList
                items={paginatedItems}
                renderItem={renderItem}
                searchQuery={debouncedSearch}
                className="space-y-3"
              />
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={previousPage}
                    disabled={!hasPreviousPage}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={!hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}