"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInventory } from "@/contexts/inventory-context"
import { Package } from "lucide-react"

interface CategoryFilterProps {
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const { categories, getCategoryStats } = useInventory()
  const categoryStats = getCategoryStats()

  return (
    <div className="space-y-3">
      <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Filter by Category
      </h3>
      <div className="space-y-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          onClick={() => onCategoryChange(null)}
          className="w-full justify-start"
          size="sm"
        >
          <Package className="h-4 w-4 mr-2" />
          All Categories
        </Button>
        {categories.map((category) => {
          const stats = categoryStats.find((stat) => stat.category === category)
          return (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => onCategoryChange(category)}
              className="w-full justify-between"
              size="sm"
            >
              <span>{category}</span>
              <Badge variant="secondary" className="ml-2">
                {stats?.count || 0}
              </Badge>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
