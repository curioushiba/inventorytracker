"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface InventoryItem {
  id: string
  name: string
  description: string
  quantity: number
  minQuantity: number
  category: string
  location: string
  lastUpdated: string
  createdAt: string
}

export interface Activity {
  id: string
  action: string
  details: string
  timestamp: string
  quantityChange?: number
}

interface InventoryContextType {
  items: InventoryItem[]
  categories: string[]
  activities: Activity[]
  addItem: (item: Omit<InventoryItem, "id" | "createdAt" | "lastUpdated">) => void
  updateItem: (id: string, updates: Partial<InventoryItem>) => void
  deleteItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  getLowStockItems: () => InventoryItem[]
  getTotalValue: () => number
  getItemsByCategory: (category: string) => InventoryItem[]
  addCategory: (category: string) => boolean
  deleteCategory: (category: string) => boolean
  updateCategory: (oldCategory: string, newCategory: string) => boolean
  getCategoryStats: () => Array<{ category: string; count: number; value: number }>
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [categories, setCategories] = useState<string[]>([
    "Electronics",
    "Office Supplies",
    "Tools",
    "Furniture",
    "Cleaning",
    "Safety Equipment",
  ])

  const addActivity = (action: string, details: string, quantityChange?: number) => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      action,
      details,
      timestamp: new Date().toISOString(),
      quantityChange,
    }
    setActivities((prev) => [newActivity, ...prev].slice(0, 50)) // Keep only last 50 activities
  }

  useEffect(() => {
    const savedItems = localStorage.getItem("inventory-items")
    const savedCategories = localStorage.getItem("inventory-categories")
    const savedActivities = localStorage.getItem("inventory-activities")

    if (savedItems) {
      setItems(JSON.parse(savedItems))
    } else {
      // Initialize with sample data
      const sampleItems: InventoryItem[] = [
        {
          id: "1",
          name: "Wireless Mouse",
          description: "Ergonomic wireless mouse with USB receiver",
          quantity: 15,
          minQuantity: 5,
          category: "Electronics",
          location: "Shelf A-1",
          createdAt: "2024-01-15",
          lastUpdated: "2024-01-20",
        },
        {
          id: "2",
          name: "Office Chair",
          description: "Adjustable height office chair with lumbar support",
          quantity: 3,
          minQuantity: 2,
          category: "Furniture",
          location: "Storage Room B",
          createdAt: "2024-01-10",
          lastUpdated: "2024-01-18",
        },
        {
          id: "3",
          name: "Printer Paper",
          description: "A4 white printer paper, 500 sheets per pack",
          quantity: 1,
          minQuantity: 5,
          category: "Office Supplies",
          location: "Supply Closet",
          createdAt: "2024-01-12",
          lastUpdated: "2024-01-22",
        },
        {
          id: "4",
          name: "Screwdriver Set",
          description: "Professional 12-piece screwdriver set",
          quantity: 8,
          minQuantity: 3,
          category: "Tools",
          location: "Tool Cabinet",
          createdAt: "2024-01-08",
          lastUpdated: "2024-01-19",
        },
      ]
      setItems(sampleItems)
      localStorage.setItem("inventory-items", JSON.stringify(sampleItems))
    }

    if (savedCategories) {
      setCategories(JSON.parse(savedCategories))
    }

    if (savedActivities) {
      setActivities(JSON.parse(savedActivities))
    }
  }, [])

  const saveItems = (newItems: InventoryItem[]) => {
    setItems(newItems)
    localStorage.setItem("inventory-items", JSON.stringify(newItems))
  }

  const saveActivities = (newActivities: Activity[]) => {
    setActivities(newActivities)
    localStorage.setItem("inventory-activities", JSON.stringify(newActivities))
  }

  const addItem = (itemData: Omit<InventoryItem, "id" | "createdAt" | "lastUpdated">) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split("T")[0],
      lastUpdated: new Date().toISOString().split("T")[0],
    }
    const newItems = [...items, newItem]
    saveItems(newItems)
    addActivity("Item Added", `Added ${itemData.name} (${itemData.quantity} units)`, itemData.quantity)
  }

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    const item = items.find((i) => i.id === id)
    const newItems = items.map((item) =>
      item.id === id ? { ...item, ...updates, lastUpdated: new Date().toISOString().split("T")[0] } : item,
    )
    saveItems(newItems)
    if (item) {
      // Avoid duplicate quantity logs when quantity is updated via updateQuantity()
      if (updates.quantity === undefined) {
        addActivity("Item Updated", `Updated ${item.name}`)
      } else {
        const delta = updates.quantity - item.quantity
        addActivity("Item Updated", `Updated ${item.name}`, delta)
      }
    }
  }

  const deleteItem = (id: string) => {
    const item = items.find((i) => i.id === id)
    const newItems = items.filter((item) => item.id !== id)
    saveItems(newItems)
    if (item) {
      // Record full removal of stock as negative change
      addActivity("Item Deleted", `Deleted ${item.name}`, -item.quantity)
    }
  }

  const updateQuantity = (id: string, quantity: number) => {
    const item = items.find((i) => i.id === id)
    updateItem(id, { quantity })
    if (item) {
      addActivity("Quantity Updated", `${item.name}: ${item.quantity} → ${quantity}`, quantity - item.quantity)
    }
  }

  const getLowStockItems = () => {
    return items.filter((item) => item.quantity <= item.minQuantity)
  }

  const getTotalValue = () => {
    return 0
  }

  const getItemsByCategory = (category: string) => {
    return items.filter((item) => item.category === category)
  }

  const addCategory = (category: string): boolean => {
    const trimmedCategory = category.trim()
    if (!trimmedCategory || categories.includes(trimmedCategory)) {
      return false
    }
    const newCategories = [...categories, trimmedCategory]
    saveCategories(newCategories)
    return true
  }

  const deleteCategory = (category: string): boolean => {
    // Check if any items use this category
    const itemsInCategory = getItemsByCategory(category)
    if (itemsInCategory.length > 0) {
      return false // Cannot delete category with items
    }
    const newCategories = categories.filter((cat) => cat !== category)
    saveCategories(newCategories)
    return true
  }

  const updateCategory = (oldCategory: string, newCategory: string): boolean => {
    const trimmedNewCategory = newCategory.trim()
    if (!trimmedNewCategory || categories.includes(trimmedNewCategory)) {
      return false
    }

    // Update category in categories array
    const newCategories = categories.map((cat) => (cat === oldCategory ? trimmedNewCategory : cat))
    saveCategories(newCategories)

    // Update category in all items that use the old category
    const newItems = items.map((item) =>
      item.category === oldCategory ? { ...item, category: trimmedNewCategory } : item,
    )
    saveItems(newItems)

    return true
  }

  const getCategoryStats = () => {
    return categories.map((category) => {
      const categoryItems = getItemsByCategory(category)
      const count = categoryItems.reduce((sum, item) => sum + item.quantity, 0)
      return { category, count, value: 0 }
    })
  }

  const saveCategories = (newCategories: string[]) => {
    setCategories(newCategories)
    localStorage.setItem("inventory-categories", JSON.stringify(newCategories))
  }

  useEffect(() => {
    if (activities.length > 0) {
      localStorage.setItem("inventory-activities", JSON.stringify(activities))
    }
  }, [activities])

  return (
    <InventoryContext.Provider
      value={{
        items,
        categories,
        activities,
        addItem,
        updateItem,
        deleteItem,
        updateQuantity,
        getLowStockItems,
        getTotalValue,
        getItemsByCategory,
        addCategory,
        deleteCategory,
        updateCategory,
        getCategoryStats,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const context = useContext(InventoryContext)
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider")
  }
  return context
}
