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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Minus } from 'lucide-react'
import type { InventoryWithProduct, InventoryAdjustmentFormData } from '@/hooks/use-inventory'

const adjustmentFormSchema = z.object({
  adjustment_type: z.enum(['manual', 'sale', 'return', 'damage', 'loss', 'found']),
  quantity_change: z.number().int().refine((val) => val !== 0, 'Quantity change cannot be zero'),
  reason: z.string().optional(),
  reference_id: z.string().optional(),
})

interface InventoryAdjustmentDialogProps {
  inventory?: InventoryWithProduct | null
  adjustmentType: 'increase' | 'decrease'
  open: boolean
  onClose: () => void
}

const adjustmentTypeOptions = [
  { value: 'manual', label: 'Manual Adjustment', description: 'Manual stock correction' },
  { value: 'damage', label: 'Damaged', description: 'Items damaged or broken' },
  { value: 'loss', label: 'Loss/Theft', description: 'Items lost or stolen' },
  { value: 'found', label: 'Found', description: 'Items found or recovered' },
  { value: 'return', label: 'Return', description: 'Customer return' },
]

export function InventoryAdjustmentDialog({ 
  inventory, 
  adjustmentType, 
  open, 
  onClose 
}: InventoryAdjustmentDialogProps) {
  const { adjustInventory } = useInventory()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<InventoryAdjustmentFormData>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      adjustment_type: 'manual',
      quantity_change: 0,
      reason: '',
      reference_id: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        adjustment_type: 'manual',
        quantity_change: adjustmentType === 'increase' ? 1 : -1,
        reason: '',
        reference_id: '',
      })
    }
  }, [open, adjustmentType, form])

  const onSubmit = async (data: InventoryAdjustmentFormData) => {
    if (!inventory) return

    try {
      setIsSubmitting(true)
      
      // Ensure quantity change has correct sign
      const quantityChange = adjustmentType === 'increase' 
        ? Math.abs(data.quantity_change)
        : -Math.abs(data.quantity_change)

      await adjustInventory(inventory.id, {
        ...data,
        quantity_change: quantityChange,
        reason: data.reason || undefined,
        reference_id: data.reference_id || undefined,
      })
      
      onClose()
    } catch (error) {
      console.error('Error adjusting inventory:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const quantity = form.watch('quantity_change')
  const adjustedQuantity = adjustmentType === 'increase' 
    ? Math.abs(quantity)
    : -Math.abs(quantity)
  const newQuantity = (inventory?.quantity || 0) + adjustedQuantity

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {adjustmentType === 'increase' ? (
              <Plus className="h-5 w-5 text-green-600" />
            ) : (
              <Minus className="h-5 w-5 text-red-600" />
            )}
            {adjustmentType === 'increase' ? 'Increase' : 'Decrease'} Inventory
          </DialogTitle>
          <DialogDescription>
            Adjust inventory for {inventory?.product.name}
          </DialogDescription>
        </DialogHeader>

        {/* Current Stock Info */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Current Stock:</span>
            <Badge variant="outline">{inventory?.quantity || 0}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">After Adjustment:</span>
            <Badge variant={newQuantity < 0 ? 'destructive' : 'default'}>
              {newQuantity}
            </Badge>
          </div>
          {newQuantity < 0 && (
            <p className="text-sm text-destructive">
              Warning: This will result in negative stock
            </p>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Adjustment Type */}
            <FormField
              control={form.control}
              name="adjustment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select adjustment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {adjustmentTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity Change */}
            <FormField
              control={form.control}
              name="quantity_change"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantity to {adjustmentType === 'increase' ? 'Add' : 'Remove'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the amount to {adjustmentType === 'increase' ? 'add to' : 'remove from'} inventory
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Explain the reason for this adjustment..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Provide additional context for this adjustment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference ID */}
            <FormField
              control={form.control}
              name="reference_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference ID (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Order #, Invoice #"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Link to related transaction or document
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
              <Button 
                type="submit" 
                disabled={isSubmitting || newQuantity < 0}
                variant={adjustmentType === 'increase' ? 'default' : 'destructive'}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {adjustmentType === 'increase' ? 'Add Stock' : 'Remove Stock'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}