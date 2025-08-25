"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useInventory } from "@/contexts/inventory-context"
import { AlertTriangle, Package, Loader2 } from "lucide-react"

export function RecentItems() {
  const { items, getLowStockItems, isLoading } = useInventory()

  // Get 5 most recently updated items
  const recentItems = useMemo(() => {
    return [...items]
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 5)
  }, [items])

  // Memoize low stock items to prevent recalculation on every render
  const lowStockItems = useMemo(() => getLowStockItems(), [items])

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-primary" />
          <span>Recent Items</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading recent items...</span>
          </div>
        ) : recentItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No items yet. Add your first inventory item!</p>
        ) : (
          recentItems.map((item) => {
            const isLowStock = lowStockItems.some((lowItem) => lowItem.id === item.id)
            return (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.location}</p>
                </div>
                <div className="text-right">
                  <Badge variant={isLowStock ? "destructive" : "secondary"} className="text-xs">
                    {item.quantity} in stock
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
