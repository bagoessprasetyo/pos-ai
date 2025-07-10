'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { productSchema } from '@/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ImageUpload } from '@/components/ui/image-upload'
import { ProductImageStorage } from '@/lib/supabase/storage'
import { useStore } from '@/contexts/store-context'
import type { Product, ProductFormData } from '@/types'
import { z } from 'zod'

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
}

type FormData = z.infer<typeof productSchema>

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [productImages, setProductImages] = useState<string[]>([])
  const { createProduct, updateProduct } = useProducts()
  const { categories } = useCategories()
  const { currentStore } = useStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      barcode: '',
      price: 0,
      cost: 0,
      category_id: '',
      weight: 0,
      is_active: true,
      is_featured: false,
      tax_exempt: false,
      track_inventory: true,
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        price: product.price,
        cost: product.cost || 0,
        category_id: product.category_id || '',
        weight: product.weight || 0,
        is_active: product.is_active,
        is_featured: product.is_featured,
        tax_exempt: product.tax_exempt,
        track_inventory: product.track_inventory,
      })
      // Set product images
      setProductImages(Array.isArray(product.images) ? product.images : [])
    } else {
      reset({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        price: 0,
        cost: 0,
        category_id: '',
        weight: 0,
        is_active: true,
        is_featured: false,
        tax_exempt: false,
        track_inventory: true,
      })
      // Clear product images
      setProductImages([])
    }
  }, [product, reset])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')

    try {
      // Include images in the form data
      const productData = {
        ...data,
        images: productImages,
      }

      if (product) {
        await updateProduct(product.id, productData)
      } else {
        await createProduct(productData)
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  // Handle image upload
  const handleImageUpload = async (files: File[]): Promise<string[]> => {
    if (!currentStore) {
      throw new Error('No store selected')
    }

    try {
      const uploadResults = await ProductImageStorage.uploadMultiple(files, currentStore.id, product?.id)
      
      // Filter out failed uploads and return URLs
      const successfulUploads = uploadResults
        .filter(result => !result.error)
        .map(result => result.url)
      
      // Log any failed uploads
      const failedUploads = uploadResults.filter(result => result.error)
      if (failedUploads.length > 0) {
        console.warn('Some uploads failed:', failedUploads)
      }

      return successfulUploads
    } catch (error) {
      console.error('Image upload failed:', error)
      throw new Error('Failed to upload images')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                {...register('sku')}
                placeholder="Product SKU"
              />
            </div>

            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                {...register('barcode')}
                placeholder="Product barcode"
              />
            </div>

            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...register('price', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                {...register('cost', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="category_id">Category</Label>
              <select
                id="category_id"
                {...register('category_id')}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="weight">Weight (optional)</Label>
              <Input
                id="weight"
                type="number"
                step="0.001"
                min="0"
                {...register('weight', { valueAsNumber: true })}
                placeholder="0.000"
              />
            </div>
          </div>

          {/* Product Images */}
          <div className="space-y-2">
            <Label>Product Images</Label>
            <ImageUpload
              images={productImages}
              onImagesChange={setProductImages}
              onUpload={handleImageUpload}
              maxImages={5}
              placeholder="Upload product images"
              disabled={loading}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', !!checked)}
              />
              <Label htmlFor="is_active">Active (visible in POS)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_featured"
                checked={watch('is_featured')}
                onCheckedChange={(checked) => setValue('is_featured', !!checked)}
              />
              <Label htmlFor="is_featured">Featured product</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="track_inventory"
                checked={watch('track_inventory')}
                onCheckedChange={(checked) => setValue('track_inventory', !!checked)}
              />
              <Label htmlFor="track_inventory">Track inventory</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tax_exempt"
                checked={watch('tax_exempt')}
                onCheckedChange={(checked) => setValue('tax_exempt', !!checked)}
              />
              <Label htmlFor="tax_exempt">Tax exempt</Label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}