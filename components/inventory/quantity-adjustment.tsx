"use client"

import { useState } from "react"
import { useInventory } from "@/contexts/inventory-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Package, Plus, Minus } from "lucide-react"

interface QuantityAdjustmentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuantityAdjustment({ open, onOpenChange }: QuantityAdjustmentProps) {
  const { items, updateItem } = useInventory()
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [adjustmentValue, setAdjustmentValue] = useState("")

  const handleItemSelect = (itemId: string) => {
    setSelectedItem(itemId)
    setAdjustmentValue("")
  }

  const handleAdjustment = async () => {
    if (!selectedItem || !adjustmentValue) return

    const item = items.find((i) => i.id === selectedItem)
    if (!item) return

    const adjustment = Number.parseInt(adjustmentValue)
    if (isNaN(adjustment)) return

    const newQuantity = Math.max(0, item.quantity + adjustment)
    const result = await updateItem(selectedItem, { quantity: newQuantity })

    if (result.success) {
      // Reset and close
      setSelectedItem(null)
      setAdjustmentValue("")
      onOpenChange(false)
    } else {
      console.error("Failed to update quantity:", result.error)
    }
  }

  const selectedItemData = items.find((i) => i.id === selectedItem)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Item Quantity</DialogTitle>
        </DialogHeader>

        {!selectedItem ? (
          <div className="space-y-4">
            <Label>Select an item to adjust:</Label>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No items available</p>
                </div>
              ) : (
                items.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleItemSelect(item.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{item.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                          </div>
                          {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{item.quantity}</div>
                          <div className="text-xs text-muted-foreground">current</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Selected Item:</Label>
              <Card className="mt-2">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{selectedItemData?.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {selectedItemData?.category}
                        </Badge>
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
                  id="adjustment"
                  type="number"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  placeholder="Enter +/- amount"
                  className="text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
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
                  <span className="font-bold">
                    {Math.max(0, selectedItemData.quantity + (Number.parseInt(adjustmentValue) || 0))}
                  </span>
                </p>
              </div>
            )}

            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setSelectedItem(null)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleAdjustment} disabled={!adjustmentValue} className="flex-1">
                Apply Change
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
