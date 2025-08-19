"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

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
  isLoading: boolean
  error: string | null
  addItem: (item: Omit<InventoryItem, "id" | "createdAt" | "lastUpdated">) => Promise<{ success: boolean; error?: string }>
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<{ success: boolean; error?: string }>
  deleteItem: (id: string) => Promise<{ success: boolean; error?: string }>
  updateQuantity: (id: string, quantity: number) => Promise<{ success: boolean; error?: string }>
  getLowStockItems: () => InventoryItem[]
  getTotalValue: () => number
  getItemsByCategory: (category: string) => InventoryItem[]
  addCategory: (category: string) => Promise<{ success: boolean; error?: string }>
  deleteCategory: (category: string) => Promise<{ success: boolean; error?: string }>
  updateCategory: (oldCategory: string, newCategory: string) => Promise<{ success: boolean; error?: string }>
  getCategoryStats: () => Array<{ category: string; count: number; value: number }>
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

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
    if (!user) {
      setItems([])
      setCategories([])
      setActivities([])
      setError(null)
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Load items
        const { data: itemRows, error: itemsError } = await supabase
          .from("items")
          .select("id,name,description,quantity,min_quantity,category,location,created_at,last_updated")
          .eq("user_id", user.id)
          .order("last_updated", { ascending: false })

        if (itemsError) {
          throw new Error(`Failed to load items: ${itemsError.message}`)
        }

        const mappedItems: InventoryItem[] = (itemRows || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? "",
          quantity: r.quantity ?? 0,
          minQuantity: r.min_quantity ?? 0,
          category: r.category ?? "",
          location: r.location ?? "",
          createdAt: r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : "",
          lastUpdated: r.last_updated ? new Date(r.last_updated).toISOString().split("T")[0] : "",
        }))
        setItems(mappedItems)

        // Load categories
        const { data: categoryRows, error: categoriesError } = await supabase
          .from("categories")
          .select("name")
          .eq("user_id", user.id)
          .order("name")

        if (categoriesError) {
          throw new Error(`Failed to load categories: ${categoriesError.message}`)
        }

        setCategories((categoryRows || []).map((c: any) => c.name))

        // Load activities
        const { data: activityRows, error: activitiesError } = await supabase
          .from("activities")
          .select("id,action,details,quantity_change,timestamp")
          .eq("user_id", user.id)
          .order("timestamp", { ascending: false })
          .limit(50)

        if (activitiesError) {
          throw new Error(`Failed to load activities: ${activitiesError.message}`)
        }

        setActivities(
          (activityRows || []).map((a: any) => ({
            id: a.id,
            action: a.action,
            details: a.details,
            timestamp: a.timestamp,
            quantityChange: a.quantity_change ?? undefined,
          }))
        )
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to load data"
        console.error("Error loading inventory data:", error)
        setError(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user])



  const addItem = async (itemData: Omit<InventoryItem, "id" | "createdAt" | "lastUpdated">): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    try {
      setError(null)
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
          name: itemData.name,
          description: itemData.description,
          quantity: itemData.quantity,
          min_quantity: itemData.minQuantity,
          category: itemData.category,
          location: itemData.location,
          created_at: now,
          last_updated: now,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to add item: ${error.message}`)
      }

      if (!data) {
        throw new Error("No data returned from database")
      }

      const newItem: InventoryItem = {
        id: data.id,
        name: data.name,
        description: data.description ?? "",
        quantity: data.quantity ?? 0,
        minQuantity: data.min_quantity ?? 0,
        category: data.category ?? "",
        location: data.location ?? "",
        createdAt: now.split("T")[0],
        lastUpdated: now.split("T")[0],
      }

      setItems(prev => [newItem, ...prev])
      addActivity("Item Added", `Added ${itemData.name} (${itemData.quantity} units)`, itemData.quantity)
      
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to add item"
      console.error("Error adding item:", error)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const updateItem = async (id: string, updates: Partial<InventoryItem>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const existing = items.find((i) => i.id === id)
    if (!existing) {
      return { success: false, error: "Item not found" }
    }

    try {
      setError(null)
      const nowDate = new Date().toISOString().split("T")[0]
      const nowISO = new Date().toISOString()

      // Update local state optimistically
      const newItems = items.map((it) => (it.id === id ? { ...it, ...updates, lastUpdated: nowDate } : it))
      setItems(newItems)

      // Update database
      const payload: any = { last_updated: nowISO }
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.description !== undefined) payload.description = updates.description
      if (updates.quantity !== undefined) payload.quantity = updates.quantity
      if (updates.minQuantity !== undefined) payload.min_quantity = updates.minQuantity
      if (updates.category !== undefined) payload.category = updates.category
      if (updates.location !== undefined) payload.location = updates.location

      const { error } = await supabase.from("items").update(payload).eq("id", id).eq("user_id", user.id)

      if (error) {
        // Rollback optimistic update
        setItems(items)
        throw new Error(`Failed to update item: ${error.message}`)
      }

      // Add activity
      if (updates.quantity !== undefined) {
        const delta = updates.quantity - existing.quantity
        addActivity("Item Updated", `Updated ${existing.name}`, delta)
      } else {
        addActivity("Item Updated", `Updated ${existing.name}`)
      }

      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to update item"
      console.error("Error updating item:", error)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const deleteItem = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const item = items.find((i) => i.id === id)
    if (!item) {
      return { success: false, error: "Item not found" }
    }

    try {
      setError(null)
      
      // Update local state optimistically
      const newItems = items.filter((it) => it.id !== id)
      setItems(newItems)

      // Delete from database
      const { error } = await supabase.from("items").delete().eq("id", id).eq("user_id", user.id)

      if (error) {
        // Rollback optimistic update
        setItems(items)
        throw new Error(`Failed to delete item: ${error.message}`)
      }

      addActivity("Item Deleted", `Deleted ${item.name}`, -item.quantity)
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to delete item"
      console.error("Error deleting item:", error)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const updateQuantity = async (id: string, quantity: number): Promise<{ success: boolean; error?: string }> => {
    const item = items.find((i) => i.id === id)
    if (!item) {
      return { success: false, error: "Item not found" }
    }

    const result = await updateItem(id, { quantity })
    if (result.success) {
      addActivity("Quantity Updated", `${item.name}: ${item.quantity} → ${quantity}`, quantity - item.quantity)
    }
    return result
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

  const addCategory = async (category: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const trimmedCategory = category.trim()
    if (!trimmedCategory) {
      return { success: false, error: "Category name cannot be empty" }
    }

    if (categories.includes(trimmedCategory)) {
      return { success: false, error: "Category already exists" }
    }

    try {
      setError(null)
      
      // Update local state optimistically
      const newCategories = [...categories, trimmedCategory]
      setCategories(newCategories)

      // Add to database
      const { error } = await supabase.from("categories").insert({ user_id: user.id, name: trimmedCategory })

      if (error) {
        // Rollback optimistic update
        setCategories(categories)
        throw new Error(`Failed to add category: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to add category"
      console.error("Error adding category:", error)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const deleteCategory = async (category: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Check if any items use this category
    const itemsInCategory = getItemsByCategory(category)
    if (itemsInCategory.length > 0) {
      return { success: false, error: "Cannot delete category that contains items" }
    }

    try {
      setError(null)
      
      // Update local state optimistically
      const newCategories = categories.filter((cat) => cat !== category)
      setCategories(newCategories)

      // Delete from database
      const { error } = await supabase.from("categories").delete().eq("user_id", user.id).eq("name", category)

      if (error) {
        // Rollback optimistic update
        setCategories(categories)
        throw new Error(`Failed to delete category: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to delete category"
      console.error("Error deleting category:", error)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const updateCategory = async (oldCategory: string, newCategory: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const trimmedNewCategory = newCategory.trim()
    if (!trimmedNewCategory) {
      return { success: false, error: "Category name cannot be empty" }
    }

    if (categories.includes(trimmedNewCategory)) {
      return { success: false, error: "Category already exists" }
    }

    try {
      setError(null)
      
      // Update local state optimistically
      const newCategories = categories.map((cat) => (cat === oldCategory ? trimmedNewCategory : cat))
      setCategories(newCategories)

      const newItems = items.map((item) =>
        item.category === oldCategory ? { ...item, category: trimmedNewCategory } : item
      )
      setItems(newItems)

      // Update database
      const categoryResult = await supabase
        .from("categories")
        .update({ name: trimmedNewCategory })
        .eq("user_id", user.id)
        .eq("name", oldCategory)

      if (categoryResult.error) {
        throw new Error(`Failed to update category: ${categoryResult.error.message}`)
      }

      const itemsResult = await supabase
        .from("items")
        .update({ category: trimmedNewCategory, last_updated: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("category", oldCategory)

      if (itemsResult.error) {
        throw new Error(`Failed to update items: ${itemsResult.error.message}`)
      }

      return { success: true }
    } catch (error) {
      // Rollback optimistic updates
      setCategories(categories)
      setItems(items)
      
      const errorMsg = error instanceof Error ? error.message : "Failed to update category"
      console.error("Error updating category:", error)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const getCategoryStats = () => {
    return categories.map((category) => {
      const categoryItems = getItemsByCategory(category)
      const count = categoryItems.reduce((sum, item) => sum + item.quantity, 0)
      return { category, count, value: 0 }
    })
  }

  return (
    <InventoryContext.Provider
      value={{
        items,
        categories,
        activities,
        isLoading,
        error,
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
