"use client"

import { useState } from "react"
import { useInventory } from "@/contexts/inventory-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Package, PlusCircle } from "lucide-react"
import { AddItemForm } from "@/components/inventory/add-item-form"
import { QuantityAdjustment } from "@/components/inventory/quantity-adjustment"
import { EditItemForm } from "@/components/inventory/edit-item-form"
import { CategoryManagement } from "@/components/categories/category-management"

export function InventoryDashboard() {
  const { items, activities } = useInventory()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showQuantityAdjustment, setShowQuantityAdjustment] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)

  const itemToEdit = editingItem ? items.find((item) => item.id === editingItem) || null : null

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header with Add New Item Button */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-foreground">DASHBOARD</h1>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowCategoryManagement(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Package className="h-4 w-4" />
            <span>Manage Categories</span>
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="flex items-center space-x-2">
            <PlusCircle className="h-4 w-4" />
            <span>Add New Item</span>
          </Button>
        </div>
      </div>

      {/* Main Items List - matches wireframe table layout */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Inventory Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No items in inventory</p>
                <p className="text-sm">Click "Add New Item" to add your first item</p>
              </div>
            ) : (
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-foreground">{item.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(item.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-foreground">{item.quantity}</div>
                      <div className="text-xs text-muted-foreground">current count</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Section - matches wireframe */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">RECENT ACTIVITY</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-48 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y">
                {activities.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{activity.action}</span>
                      <div className="flex items-center space-x-4">
                        {typeof activity.quantityChange === "number" && activity.quantityChange !== 0 && (
                          <span
                            className={
                              activity.quantityChange > 0
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {activity.quantityChange > 0 ? `+${activity.quantityChange}` : activity.quantityChange}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground mt-1">{activity.details}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Button - matches wireframe circular + button */}
      <Button
        onClick={() => setShowQuantityAdjustment(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add Item Form Modal */}
      <AddItemForm open={showAddForm} onOpenChange={setShowAddForm} />

      <QuantityAdjustment open={showQuantityAdjustment} onOpenChange={setShowQuantityAdjustment} />

      <EditItemForm open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)} item={itemToEdit} />

      {/* CategoryManagement modal */}
      <CategoryManagement open={showCategoryManagement} onOpenChange={setShowCategoryManagement} />
    </div>
  )
}
