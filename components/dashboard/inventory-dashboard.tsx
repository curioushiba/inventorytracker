"use client"

import { useState } from "react"
import { useInventory } from "@/contexts/inventory-context"
import { useOffline } from "@/contexts/offline-context"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Package, PlusCircle, TrendingUp, Activity, Loader2 } from "lucide-react"
import { 
  LazyAddItemForm, 
  LazyQuantityAdjustment, 
  LazyEditItemForm, 
  LazyCategoryManagement 
} from "@/components/lazy-components"
// import { MobileEnhancedDashboard } from "./mobile-enhanced-dashboard" // Temporarily disabled

export function InventoryDashboard() {
  const { items, activities, isLoading } = useInventory()
  const { isOffline, syncStatus } = useOffline()
  const isMobile = useIsMobile()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showQuantityAdjustment, setShowQuantityAdjustment] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)

  const itemToEdit = editingItem ? items.find((item) => item.id === editingItem) || null : null

  // Use mobile-enhanced dashboard on mobile devices
  if (isMobile) {
    // return <MobileEnhancedDashboard /> // Temporarily disabled
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20 space-y-8">
      {/* Premium Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">DASHBOARD</h1>
            {isOffline && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                Offline Mode
              </Badge>
            )}
            {syncStatus?.status === 'syncing' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Syncing...
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isOffline 
              ? "Working offline - changes will sync when connected" 
              : "Manage your inventory with precision"
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowCategoryManagement(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Package className="h-4 w-4" />
            <span>Categories</span>
          </Button>
          <Button 
            onClick={() => setShowAddForm(true)} 
            className="flex items-center space-x-2"
            size="lg"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Item</span>
          </Button>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-3 rounded-xl">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : items.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-secondary to-secondary/80 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : items.reduce((sum, item) => sum + item.quantity, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-accent-foreground to-accent-foreground/80 p-3 rounded-xl">
                <Activity className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : activities.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Items List - Premium Design */}
      <Card className="glass shadow-premium-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center space-x-2">
            <Package className="h-5 w-5 text-primary" />
            <span>Inventory Items</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading inventory...</span>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <div className="bg-gradient-to-br from-muted to-muted/50 p-6 rounded-2xl inline-block mb-4">
                  <Package className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No items yet</h3>
                <p className="text-muted-foreground mb-4">Start building your inventory by adding your first item</p>
                <Button onClick={() => setShowAddForm(true)} className="flex items-center space-x-2">
                  <PlusCircle className="h-4 w-4" />
                  <span>Add First Item</span>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-6 hover:bg-accent/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-foreground text-lg">{item.name}</h3>
                        <Badge variant="secondary" className="text-xs font-medium">
                          {item.category || "Uncategorized"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(item.id)}
                          className="h-8 w-8 p-0 hover:bg-accent/50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                      )}
                      {item.location && (
                        <p className="text-xs text-muted-foreground mt-1">📍 {item.location}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground">{item.quantity}</div>
                      <div className="text-xs text-muted-foreground font-medium">units</div>
                      {item.minQuantity > 0 && item.quantity <= item.minQuantity && (
                        <div className="text-xs text-destructive font-medium mt-1">Low stock</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Section - Premium Design */}
      <Card className="glass shadow-premium-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading activities...</span>
                </div>
              </div>
            ) : activities.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-gradient-to-br from-muted to-muted/50 p-4 rounded-xl inline-block mb-3">
                  <Activity className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {activities.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">{activity.action}</span>
                      <div className="flex items-center space-x-3">
                        {typeof activity.quantityChange === "number" && activity.quantityChange !== 0 && (
                          <span
                            className={`text-sm font-semibold px-2 py-1 rounded-md ${
                              activity.quantityChange > 0
                                ? "bg-success/10 text-success"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {activity.quantityChange > 0 ? `+${activity.quantityChange}` : activity.quantityChange}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground font-medium">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">{activity.details}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Floating Action Button */}
      <Button
        onClick={() => setShowQuantityAdjustment(true)}
        className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-premium-xl hover:shadow-premium-xl hover:scale-105 transition-all duration-200 bg-gradient-to-br from-primary to-secondary"
        size="icon"
      >
        <Plus className="h-8 w-8" />
      </Button>

      {/* Modals - Lazy loaded for better performance */}
      {showAddForm && (
        <LazyAddItemForm open={showAddForm} onOpenChange={setShowAddForm} />
      )}
      {showQuantityAdjustment && (
        <LazyQuantityAdjustment open={showQuantityAdjustment} onOpenChange={setShowQuantityAdjustment} />
      )}
      {editingItem && (
        <LazyEditItemForm open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)} item={itemToEdit} />
      )}
      {showCategoryManagement && (
        <LazyCategoryManagement open={showCategoryManagement} onOpenChange={setShowCategoryManagement} />
      )}
    </div>
  )
}
