"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { useInventory } from "@/contexts/inventory-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Package, Plus, Minus, Search, ArrowLeft, Zap } from "lucide-react"
import { VirtualList } from "@/components/ui/virtual-list"
import { useDebounce } from "@/hooks/use-optimized-data"

interface QuickAdjustmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAdjustmentModal({ open, onOpenChange }: QuickAdjustmentModalProps) {
  const { items, updateQuantity } = useInventory()
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [adjustmentValue, setAdjustmentValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [quickAdjustments, setQuickAdjustments] = useState<Record<string, number>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  
  const debouncedSearch = useDebounce(searchQuery, 200)

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items
    const query = debouncedSearch.toLowerCase()
    return items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    )
  }, [items, debouncedSearch])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedItem(null)
      setAdjustmentValue("")
      setSearchQuery("")
      setQuickAdjustments({})
    }
  }, [open])

  const handleItemSelect = useCallback((itemId: string) => {
    setSelectedItem(itemId)
    setAdjustmentValue(quickAdjustments[itemId]?.toString() || "")
    // Focus input on mobile for quick entry
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [quickAdjustments])

  const handleQuickAdd = useCallback((itemId: string, amount: number) => {
    setQuickAdjustments(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + amount
    }))
  }, [])

  const handleApplyAdjustment = useCallback(async () => {
    if (!selectedItem || !adjustmentValue) return

    const item = items.find((i) => i.id === selectedItem)
    if (!item) return

    const adjustment = Number.parseInt(adjustmentValue)
    if (isNaN(adjustment)) return

    const newQuantity = Math.max(0, item.quantity + adjustment)
    const result = await updateQuantity(selectedItem, newQuantity)

    if (result.success) {
      // Clear this item's adjustment
      setQuickAdjustments(prev => {
        const next = { ...prev }
        delete next[selectedItem]
        return next
      })
      setSelectedItem(null)
      setAdjustmentValue("")
      
      // If no more adjustments, close modal
      if (Object.keys(quickAdjustments).length <= 1) {
        onOpenChange(false)
      }
    }
  }, [selectedItem, adjustmentValue, items, updateQuantity, quickAdjustments, onOpenChange])

  const handleApplyAll = useCallback(async () => {
    const adjustmentPromises = Object.entries(quickAdjustments).map(async ([itemId, adjustment]) => {
      const item = items.find(i => i.id === itemId)
      if (!item) return null
      
      const newQuantity = Math.max(0, item.quantity + adjustment)
      return updateQuantity(itemId, newQuantity)
    })

    await Promise.all(adjustmentPromises)
    onOpenChange(false)
  }, [quickAdjustments, items, updateQuantity, onOpenChange])

  const selectedItemData = items.find((i) => i.id === selectedItem)
  const hasAdjustments = Object.keys(quickAdjustments).length > 0

  // Render item for virtual list
  const renderItem = useCallback((item: any, index: number) => {
    const adjustment = quickAdjustments[item.id] || 0
    const isLowStock = item.minQuantity > 0 && item.quantity <= item.minQuantity

    return (
      <Card
        key={item.id}
        className="cursor-pointer active:bg-accent/20 transition-colors touch-manipulation mb-2"
        onClick={() => handleItemSelect(item.id)}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium truncate">{item.name}</span>
                {item.category && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {item.category}
                  </Badge>
                )}
                {isLowStock && (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    Low
                  </Badge>
                )}
              </div>
              {item.location && (
                <p className="text-xs text-muted-foreground truncate">
                  📍 {item.location}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="font-semibold">{item.quantity}</div>
                {adjustment !== 0 && (
                  <div className={`text-xs font-bold ${adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {adjustment > 0 ? '+' : ''}{adjustment}
                  </div>
                )}
              </div>
              <div className="flex flex-col space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 touch-manipulation"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuickAdd(item.id, 1)
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 touch-manipulation"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuickAdd(item.id, -1)
                  }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }, [quickAdjustments, handleItemSelect, handleQuickAdd])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Quick Inventory Adjustment</span>
          </DialogTitle>
          {hasAdjustments && (
            <Badge variant="secondary" className="w-fit mt-2">
              {Object.keys(quickAdjustments).length} items pending
            </Badge>
          )}
        </DialogHeader>

        {!selectedItem ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-4 space-y-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              {hasAdjustments && (
                <Button 
                  onClick={handleApplyAll}
                  className="w-full touch-manipulation"
                  variant="default"
                >
                  Apply All Changes ({Object.keys(quickAdjustments).length})
                </Button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 mobile-scroll">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{searchQuery ? 'No items match your search' : 'No items available'}</p>
                </div>
              ) : filteredItems.length > 20 ? (
                <VirtualList
                  items={filteredItems}
                  itemHeight={100}
                  containerHeight={400}
                  renderItem={renderItem}
                  overscan={3}
                />
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item, index) => renderItem(item, index))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4">
            <div>
              <Label>Selected Item:</Label>
              <Card className="mt-2">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{selectedItemData?.name}</span>
                        {selectedItemData?.category && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedItemData.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{selectedItemData?.quantity}</div>
                      <div className="text-xs text-muted-foreground">current</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment">Adjustment Amount:</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="touch-manipulation"
                  onClick={() =>
                    setAdjustmentValue((prev) => {
                      const current = Number.parseInt(prev) || 0
                      return (current - 1).toString()
                    })
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  ref={inputRef}
                  id="adjustment"
                  type="number"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  placeholder="Enter +/- amount"
                  className="text-center text-lg font-semibold"
                  inputMode="numeric"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="touch-manipulation"
                  onClick={() =>
                    setAdjustmentValue((prev) => {
                      const current = Number.parseInt(prev) || 0
                      return (current + 1).toString()
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Use positive numbers to add, negative to subtract</p>
            </div>

            {adjustmentValue && selectedItemData && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">New quantity will be: </span>
                  <span className="font-bold text-lg">
                    {Math.max(0, selectedItemData.quantity + (Number.parseInt(adjustmentValue) || 0))}
                  </span>
                </p>
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedItem(null)} 
                className="flex-1 touch-manipulation"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleApplyAdjustment} 
                disabled={!adjustmentValue} 
                className="flex-1 touch-manipulation"
              >
                Apply Change
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}