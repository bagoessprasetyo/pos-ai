'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useInventory } from '@/hooks/use-inventory'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { InventoryWithProduct, InventoryFormData } from '@/hooks/use-inventory'

const inventoryFormSchema = z.object({
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  reserved_quantity: z.number().min(0, 'Reserved quantity cannot be negative').optional(),
  reorder_point: z.number().min(0, 'Reorder point cannot be negative').optional(),
  reorder_quantity: z.number().min(0, 'Reorder quantity cannot be negative').optional(),
})

interface InventoryDialogProps {
  inventory?: InventoryWithProduct | null
  open: boolean
  onClose: () => void
}

export function InventoryDialog({ inventory, open, onClose }: InventoryDialogProps) {
  const { updateInventory } = useInventory()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      quantity: 0,
      reserved_quantity: 0,
      reorder_point: 0,
      reorder_quantity: 0,
    },
  })

  useEffect(() => {
    if (inventory) {
      form.reset({
        quantity: inventory.quantity,
        reserved_quantity: inventory.reserved_quantity,
        reorder_point: inventory.reorder_point,
        reorder_quantity: inventory.reorder_quantity,
      })
    } else {
      form.reset({
        quantity: 0,
        reserved_quantity: 0,
        reorder_point: 0,
        reorder_quantity: 0,
      })
    }
  }, [inventory, form])

  const onSubmit = async (data: InventoryFormData) => {
    if (!inventory) return

    try {
      setIsSubmitting(true)
      await updateInventory(inventory.id, data)
      onClose()
    } catch (error) {
      console.error('Error updating inventory:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Inventory</DialogTitle>
          <DialogDescription>
            Update inventory settings for {inventory?.product.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Total available quantity in stock
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reserved Quantity */}
            <FormField
              control={form.control}
              name="reserved_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserved Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Quantity reserved for pending orders
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reorder Point */}
            <FormField
              control={form.control}
              name="reorder_point"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Point</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Alert when stock drops to this level (0 = no alert)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reorder Quantity */}
            <FormField
              control={form.control}
              name="reorder_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Suggested quantity to reorder
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Inventory
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}