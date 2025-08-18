"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { useInventory, type InventoryItem } from "@/contexts/inventory-context"
import { Search, Filter, SortAsc, SortDesc, X, AlertTriangle, Package, Plus, Minus } from "lucide-react"

interface SearchInterfaceProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FilterOptions {
  searchTerm: string
  category: string
  stockLevel: "all" | "in-stock" | "low-stock" | "out-of-stock"
  sortBy: "name" | "quantity" | "lastUpdated"
  sortOrder: "asc" | "desc"
}

export function SearchInterface({ open, onOpenChange }: SearchInterfaceProps) {
  const { items, categories, getLowStockItems, updateQuantity } = useInventory()
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: "",
    category: "all",
    stockLevel: "all",
    sortBy: "name",
    sortOrder: "asc",
  })

  const lowStockItems = getLowStockItems()
  

  const filteredAndSortedItems = items
    .filter((item) => {
      // Text search
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        const matchesSearch =
          item.name.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.location.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Category filter
      if (filters.category !== "all" && item.category !== filters.category) {
        return false
      }

      // Removed price filter

      // Stock level filter
      switch (filters.stockLevel) {
        case "in-stock":
          return item.quantity > item.minQuantity
        case "low-stock":
          return item.quantity <= item.minQuantity && item.quantity > 0
        case "out-of-stock":
          return item.quantity === 0
        default:
          return true
      }
    })
    .sort((a, b) => {
      let comparison = 0
      switch (filters.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "quantity":
          comparison = a.quantity - b.quantity
          break
        // Removed price sorting
        case "lastUpdated":
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
          break
      }
      return filters.sortOrder === "desc" ? -comparison : comparison
    })

  const handleQuantityChange = (item: InventoryItem, change: number) => {
    const newQuantity = Math.max(0, item.quantity + change)
    updateQuantity(item.id, newQuantity)
  }

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      category: "all",
      stockLevel: "all",
      sortBy: "name",
      sortOrder: "asc",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search & Filter Inventory</span>
          </DialogTitle>
          <DialogDescription>Find and filter your inventory items with advanced search options.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search and Filter Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </span>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="space-y-2">
                <Label htmlFor="search">Search Items</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, description, location, or category..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
                    className="pl-10 bg-input"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Category Filter */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stock Level Filter */}
                <div className="space-y-2">
                  <Label>Stock Level</Label>
                  <Select
                    value={filters.stockLevel}
                    onValueChange={(value: any) => setFilters((prev) => ({ ...prev, stockLevel: value }))}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low-stock">Low Stock</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value: any) => setFilters((prev) => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="quantity">Quantity</SelectItem>
                      <SelectItem value="lastUpdated">Last Updated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Select
                    value={filters.sortOrder}
                    onValueChange={(value: any) => setFilters((prev) => ({ ...prev, sortOrder: value }))}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">
                        <div className="flex items-center space-x-2">
                          <SortAsc className="h-3 w-3" />
                          <span>Ascending</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="desc">
                        <div className="flex items-center space-x-2">
                          <SortDesc className="h-3 w-3" />
                          <span>Descending</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Removed price range slider */}
            </CardContent>
          </Card>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold">Search Results ({filteredAndSortedItems.length} items)</h3>
            </div>

            {filteredAndSortedItems.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-heading font-semibold mb-2">No Items Found</h3>
                  <p className="text-muted-foreground text-center">
                    Try adjusting your search terms or filters to find items.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedItems.map((item) => {
                  const isLowStock = lowStockItems.some((lowItem) => lowItem.id === item.id)
                  return (
                    <Card key={item.id} className={`bg-card ${isLowStock ? "border-destructive/50" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-heading font-semibold">{item.name}</h4>
                              {isLowStock && (
                                <Badge variant="destructive" className="flex items-center space-x-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Low Stock</span>
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>{item.category}</span>
                              <span>{item.location}</span>
                              <span>Updated: {item.lastUpdated}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-lg font-heading font-bold">{item.quantity}</p>
                              <p className="text-xs text-muted-foreground">in stock</p>
                            </div>

                            <div className="flex items-center space-x-1">
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
