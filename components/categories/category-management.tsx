"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useInventory } from "@/contexts/inventory-context"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Package } from "lucide-react"

interface CategoryManagementProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryManagement({ open, onOpenChange }: CategoryManagementProps) {
  const { categories, addCategory, deleteCategory, updateCategory, getCategoryStats } = useInventory()
  const { toast } = useToast()
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState("")
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const categoryStats = getCategoryStats()

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    const result = await addCategory(newCategoryName)
    if (result.success) {
      toast({
        title: "Category Added",
        description: `"${newCategoryName}" has been added to your categories.`,
      })
      setNewCategoryName("")
    } else {
      toast({
        title: "Error",
        description: result.error || "Category already exists or invalid name.",
        variant: "destructive",
      })
    }
  }

  const handleEditCategory = (category: string) => {
    setEditingCategory(category)
    setEditCategoryName(category)
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return

    const result = await updateCategory(editingCategory, editCategoryName)
    if (result.success) {
      toast({
        title: "Category Updated",
        description: `Category has been updated to "${editCategoryName}".`,
      })
      setEditingCategory(null)
      setEditCategoryName("")
    } else {
      toast({
        title: "Error",
        description: result.error || "Category name already exists or invalid.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = (category: string) => {
    setDeletingCategory(category)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return

    const result = await deleteCategory(deletingCategory)
    if (result.success) {
      toast({
        title: "Category Deleted",
        description: `"${deletingCategory}" has been removed.`,
      })
    } else {
      toast({
        title: "Cannot Delete Category",
        description: result.error || "This category contains items. Move or delete items first.",
        variant: "destructive",
      })
    }
    setDeletingCategory(null)
    setDeleteDialogOpen(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Category Management</DialogTitle>
            <DialogDescription>Add, edit, or delete inventory categories to organize your items.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add New Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Label htmlFor="newCategory" className="sr-only">
                      Category Name
                    </Label>
                    <Input
                      id="newCategory"
                      placeholder="Enter category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                      className="bg-input"
                    />
                  </div>
                  <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Existing Categories ({categories.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categories.map((category) => {
                    const stats = categoryStats.find((stat) => stat.category === category)
                    const isEditing = editingCategory === category

                    return (
                      <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="flex space-x-2">
                              <Input
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleUpdateCategory()
                                  if (e.key === "Escape") {
                                    setEditingCategory(null)
                                    setEditCategoryName("")
                                  }
                                }}
                                className="bg-input"
                                autoFocus
                              />
                              <Button size="sm" onClick={handleUpdateCategory}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCategory(null)
                                  setEditCategoryName("")
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <h4 className="font-medium">{category}</h4>
                              <div className="flex items-center space-x-4 mt-1">
                                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                  <Package className="h-3 w-3" />
                                  <span>{stats?.count || 0} items</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditCategory(category)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteCategory(category)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory}"? This action cannot be undone. Categories with
              existing items cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} className="bg-destructive hover:bg-destructive/90">
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
