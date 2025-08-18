"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddItemForm } from "@/components/inventory/add-item-form"
import { CategoryManagement } from "@/components/categories/category-management"
import { SearchInterface } from "@/components/search/search-interface"
import { Plus, Search, BarChart3, Settings } from "lucide-react"

export function QuickActions() {
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [categoryManagementOpen, setCategoryManagementOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const actions = [
    {
      title: "Add Item",
      description: "Add new inventory item",
      icon: Plus,
      action: () => setAddItemOpen(true),
      variant: "default" as const,
    },
    {
      title: "Search Items",
      description: "Find specific items",
      icon: Search,
      action: () => setSearchOpen(true),
      variant: "outline" as const,
    },
    {
      title: "View Reports",
      description: "Inventory analytics",
      icon: BarChart3,
      action: () => {
        console.log("Reports clicked")
      },
      variant: "outline" as const,
    },
    {
      title: "Settings",
      description: "Manage categories",
      icon: Settings,
      action: () => setCategoryManagementOpen(true),
      variant: "outline" as const,
    },
  ]

  return (
    <>
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((action) => (
              <Button
                key={action.title}
                variant={action.variant}
                onClick={action.action}
                className="h-auto p-4 flex flex-col items-start space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <action.icon className="h-4 w-4" />
                  <span className="font-medium">{action.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">{action.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AddItemForm open={addItemOpen} onOpenChange={setAddItemOpen} />
      <CategoryManagement open={categoryManagementOpen} onOpenChange={setCategoryManagementOpen} />
      <SearchInterface open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
