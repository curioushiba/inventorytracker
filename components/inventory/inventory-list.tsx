"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInventory } from "@/contexts/inventory-context"
import { EditItemForm } from "./edit-item-form"
import { DeleteItemDialog } from "./delete-item-dialog"
import { CategoryFilter } from "@/components/categories/category-filter"
import { Package, Edit, Trash2, Plus, Minus, AlertTriangle } from "lucide-react"
import type { InventoryItem } from "@/contexts/inventory-context"

export function InventoryList() {
  const { items, updateQuantity, getLowStockItems, getItemsByCategory } = useInventory()
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null)
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const lowStockItems = getLowStockItems()

  const filteredItems = selectedCategory ? getItemsByCategory(selectedCategory) : items

  const handleQuantityChange = (item: InventoryItem, change: number) => {
    const newQuantity = Math.max(0, item.quantity + change)
    updateQuantity(item.id, newQuantity)
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setEditFormOpen(true)
  }

  const handleDelete = (item: InventoryItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  if (items.length === 0) {
    return (
      <Card className="bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-heading font-semibold mb-2">No Items Yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Start building your inventory by adding your first item.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Card className="bg-card">
            <CardContent className="p-4">
              <CategoryFilter selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading font-semibold">
              {selectedCategory ? `${selectedCategory} Items` : "All Items"} ({filteredItems.length})
            </h3>
            {selectedCategory && (
              <Button variant="outline" size="sm" onClick={() => setSelectedCategory(null)}>
                Clear Filter
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {filteredItems.map((item) => {
              const isLowStock = lowStockItems.some((lowItem) => lowItem.id === item.id)
              return (
                <Card key={item.id} className={`bg-card ${isLowStock ? "border-destructive/50" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-heading font-semibold text-lg">{item.name}</h4>
                          {isLowStock && (
                            <Badge variant="destructive" className="flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Low Stock</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">{item.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Category:</span>
                            <p className="font-medium">{item.category}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Location:</span>
                            <p className="font-medium">{item.location}</p>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">Min Quantity:</span>
                            <p className="font-medium">{item.minQuantity}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-3 ml-6">
                        <div className="text-right">
                          <p className="text-2xl font-heading font-bold">{item.quantity}</p>
                          <p className="text-xs text-muted-foreground">in stock</p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item, -1)}
                            disabled={item.quantity === 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleQuantityChange(item, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(item)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      <EditItemForm open={editFormOpen} onOpenChange={setEditFormOpen} item={editingItem} />
      <DeleteItemDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} item={deletingItem} />
    </>
  )
}
