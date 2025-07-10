'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDiscounts } from '@/hooks/use-discounts'
import { useProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Loader2, X } from 'lucide-react'
import type { Discount, DiscountFormData } from '@/types'
import { formatPrice } from '@/utils/currency'

const discountSchema = z.object({
  name: z.string().min(1, 'Discount name is required'),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y']),
  value: z.number().min(0, 'Value must be positive'),
  applicable_to: z.enum(['all', 'categories', 'products']),
  applicable_ids: z.array(z.string()).optional(),
  code: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  usage_limit: z.number().int().positive().optional(),
  conditions: z.object({
    minimum_purchase: z.number().min(0).optional(),
    maximum_discount: z.number().min(0).optional(),
    buy_quantity: z.number().int().positive().optional(),
    get_quantity: z.number().int().positive().optional(),
  }).optional(),
  is_active: z.boolean(),
})

interface DiscountDialogProps {
  discount?: Discount | null
  open: boolean
  onClose: () => void
}

export function DiscountDialog({ discount, open, onClose }: DiscountDialogProps) {
  const { createDiscount, updateDiscount } = useDiscounts()
  const { products } = useProducts()
  const { categories } = useCategories()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      applicable_to: 'all',
      applicable_ids: [],
      code: '',
      start_date: '',
      end_date: '',
      usage_limit: undefined,
      conditions: {
        minimum_purchase: undefined,
        maximum_discount: undefined,
        buy_quantity: undefined,
        get_quantity: undefined,
      },
      is_active: true,
    },
  })

  const watchType = form.watch('type')
  const watchApplicableTo = form.watch('applicable_to')

  useEffect(() => {
    if (discount) {
      form.reset({
        name: discount.name,
        description: discount.description || '',
        type: discount.type as any,
        value: discount.value,
        applicable_to: discount.applicable_to as any,
        applicable_ids: discount.applicable_ids,
        code: discount.code || '',
        start_date: discount.start_date ? new Date(discount.start_date).toISOString().split('T')[0] : '',
        end_date: discount.end_date ? new Date(discount.end_date).toISOString().split('T')[0] : '',
        usage_limit: discount.usage_limit || undefined,
        conditions: discount.conditions as any || {},
        is_active: discount.is_active,
      })
      setSelectedItems(discount.applicable_ids || [])
    } else {
      form.reset({
        name: '',
        description: '',
        type: 'percentage',
        value: 0,
        applicable_to: 'all',
        applicable_ids: [],
        code: '',
        start_date: '',
        end_date: '',
        usage_limit: undefined,
        conditions: {},
        is_active: true,
      })
      setSelectedItems([])
    }
  }, [discount, form])

  const onSubmit = async (data: DiscountFormData) => {
    try {
      setIsSubmitting(true)
      
      const formData = {
        ...data,
        applicable_ids: selectedItems,
        conditions: data.conditions || {},
      }

      if (discount) {
        await updateDiscount(discount.id, formData)
      } else {
        await createDiscount(formData)
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving discount:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleItemSelection = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId])
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId))
    }
  }

  const getItemName = (itemId: string) => {
    if (watchApplicableTo === 'products') {
      return products.find(p => p.id === itemId)?.name || 'Unknown Product'
    } else if (watchApplicableTo === 'categories') {
      return categories.find(c => c.id === itemId)?.name || 'Unknown Category'
    }
    return itemId
  }

  const availableItems = watchApplicableTo === 'products' ? products : 
                         watchApplicableTo === 'categories' ? categories : []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {discount ? 'Edit Discount' : 'Create New Discount'}
          </DialogTitle>
          <DialogDescription>
            {discount 
              ? 'Update the discount information below.' 
              : 'Create a new discount or promotion for your store.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer Sale, 10% Off Electronics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of this discount..."
                        className="resize-none"
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Discount Type and Value */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                        <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchType === 'percentage' ? 'Percentage (%)' : 
                       watchType === 'fixed_amount' ? 'Amount' : 'Buy Quantity'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step={watchType === 'percentage' ? '0.1' : '0.01'}
                        placeholder={watchType === 'percentage' ? '10' : '5.00'}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      {watchType === 'percentage' && 'Enter percentage (e.g., 10 for 10%)'}
                      {watchType === 'fixed_amount' && 'Enter fixed discount amount'}
                      {watchType === 'buy_x_get_y' && 'Enter quantity to buy'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Buy X Get Y specific fields */}
            {watchType === 'buy_x_get_y' && (
              <FormField
                control={form.control}
                name="conditions.get_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Get Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      How many items customer gets for free
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Applicable To */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="applicable_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apply To *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select what to apply to" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="categories">Specific Categories</SelectItem>
                        <SelectItem value="products">Specific Products</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Item Selection */}
              {watchApplicableTo !== 'all' && (
                <div className="space-y-3">
                  <Label>
                    Select {watchApplicableTo === 'products' ? 'Products' : 'Categories'}
                  </Label>
                  
                  {/* Selected items */}
                  {selectedItems.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedItems.map(itemId => (
                        <Badge key={itemId} variant="secondary" className="flex items-center gap-1">
                          {getItemName(itemId)}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleItemSelection(itemId, false)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Available items */}
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                    {availableItems.map(item => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => handleItemSelection(item.id, !!checked)}
                        />
                        <div className="flex-1 text-sm">
                          <span className="font-medium">{item.name}</span>
                          {watchApplicableTo === 'products' && (item as any).price && (
                            <span className="ml-2 text-muted-foreground">
                              {formatPrice((item as any).price)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Conditions */}
            <div className="space-y-4">
              <Label>Conditions (Optional)</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="conditions.minimum_purchase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Purchase</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum cart value required
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchType === 'percentage' && (
                  <FormField
                    control={form.control}
                    name="conditions.maximum_discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Discount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Cap the maximum discount amount
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Coupon Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupon Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., SUMMER2024"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty for automatic discounts, or enter a code customers must provide
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When the discount becomes active
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When the discount expires
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Usage Limit */}
            <FormField
              control={form.control}
              name="usage_limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usage Limit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of times this discount can be used
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active Discount</FormLabel>
                    <FormDescription>
                      Inactive discounts are not applied to transactions
                    </FormDescription>
                  </div>
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
                {discount ? 'Update Discount' : 'Create Discount'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}