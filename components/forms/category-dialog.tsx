'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCategories } from '@/hooks/use-categories'
import { categorySchema } from '@/utils/validation'
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
import { ImageUpload } from '@/components/ui/image-upload'
import { CategoryImageStorage } from '@/lib/supabase/storage'
import { useStore } from '@/contexts/store-context'
import { Loader2 } from 'lucide-react'
import type { Category, CategoryFormData } from '@/types'

// Use the schema from validation utils
const categoryFormSchema = categorySchema

interface CategoryDialogProps {
  category?: Category | null
  open: boolean
  onClose: () => void
}

export function CategoryDialog({ category, open, onClose }: CategoryDialogProps) {
  const { categories, createCategory, updateCategory, getCategoryHierarchy } = useCategories()
  const { currentStore } = useStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoryImage, setCategoryImage] = useState<string[]>([])

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      parent_id: '',
      sort_order: 0,
      is_active: true,
    },
  })

  // Get available parent categories (exclude current category and its descendants)
  const getAvailableParents = () => {
    if (!category) return categories.filter(c => !c.parent_id) // Root categories only for new categories
    
    const excludeIds = new Set<string>([category.id])
    
    // Simple approach: exclude current category and find descendants by parent_id
    const findDescendants = (parentId: string) => {
      categories.forEach(cat => {
        if (cat.parent_id === parentId) {
          excludeIds.add(cat.id)
          findDescendants(cat.id) // Recursively find descendants
        }
      })
    }
    
    findDescendants(category.id)
    
    return categories.filter(c => !excludeIds.has(c.id))
  }

  const availableParents = getAvailableParents()

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || '',
        parent_id: category.parent_id || '',
        image_url: category.image_url || '',
        sort_order: category.sort_order,
        is_active: category.is_active,
      })
      setCategoryImage(category.image_url ? [category.image_url] : [])
    } else {
      form.reset({
        name: '',
        description: '',
        parent_id: '',
        image_url: '',
        sort_order: 0,
        is_active: true,
      })
      setCategoryImage([])
    }
  }, [category, form])

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setIsSubmitting(true)
      
      // Convert empty strings to undefined for optional fields
      const formData = {
        ...data,
        description: data.description || undefined,
        parent_id: data.parent_id || undefined,
        image_url: categoryImage[0] || undefined,
      }

      if (category) {
        await updateCategory(category.id, formData)
      } else {
        await createCategory(formData)
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving category:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle image upload
  const handleImageUpload = async (files: File[]): Promise<string[]> => {
    if (!currentStore) {
      throw new Error('No store selected')
    }

    try {
      const file = files[0] // Only take the first file for categories
      const uploadResult = await CategoryImageStorage.upload(file, currentStore.id)
      
      if (uploadResult.error) {
        throw new Error(uploadResult.error)
      }

      return [uploadResult.url]
    } catch (error) {
      console.error('Category image upload failed:', error)
      throw new Error('Failed to upload image')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
          <DialogDescription>
            {category 
              ? 'Update the category information below.' 
              : 'Add a new category to organize your products.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Category Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Electronics, Clothing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of this category..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description to help identify this category
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Image */}
            <div className="space-y-2">
              <FormLabel>Category Image</FormLabel>
              <ImageUpload
                images={categoryImage}
                onImagesChange={setCategoryImage}
                onUpload={handleImageUpload}
                maxImages={1}
                placeholder="Upload category image"
                disabled={isSubmitting}
              />
              <FormDescription>
                Optional image to represent this category
              </FormDescription>
            </div>

            {/* Parent Category */}
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Category</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a parent category (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Parent (Root Category)</SelectItem>
                      {availableParents.map((parentCategory) => (
                        <SelectItem key={parentCategory.id} value={parentCategory.id}>
                          {parentCategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a parent category to create a subcategory
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sort Order */}
            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="999"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Lower numbers appear first (0 = first)
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
                    <FormLabel>Active Category</FormLabel>
                    <FormDescription>
                      Inactive categories are hidden from product selection
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
                {category ? 'Update Category' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}