"use client"
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
import { useInventory, type InventoryItem } from "@/contexts/inventory-context"
import { useToast } from "@/hooks/use-toast"

interface DeleteItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
}

export function DeleteItemDialog({ open, onOpenChange, item }: DeleteItemDialogProps) {
  const { deleteItem } = useInventory()
  const { toast } = useToast()

  const handleDelete = () => {
    if (!item) return

    deleteItem(item.id)
    toast({
      title: "Item Deleted",
      description: `${item.name} has been removed from your inventory.`,
    })
    onOpenChange(false)
  }

  if (!item) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading">Delete Item</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{item.name}"? This action cannot be undone and will permanently remove the
            item from your inventory.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Delete Item
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
