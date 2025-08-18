"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useInventory } from "@/contexts/inventory-context"
import { Package, AlertTriangle, Archive } from "lucide-react"

export function OverviewCards() {
  const { items, getLowStockItems } = useInventory()

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const lowStockItems = getLowStockItems()
  const totalCategories = new Set(items.map((item) => item.category)).size

  const cards = [
    {
      title: "Total Items",
      value: totalItems.toString(),
      icon: Package,
      description: `${items.length} unique products`,
      color: "text-primary",
    },
    {
      title: "Low Stock Alerts",
      value: lowStockItems.length.toString(),
      icon: AlertTriangle,
      description: "Items need restocking",
      color: lowStockItems.length > 0 ? "text-destructive" : "text-muted-foreground",
    },
    
    {
      title: "Categories",
      value: totalCategories.toString(),
      icon: Archive,
      description: "Product categories",
      color: "text-secondary",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
