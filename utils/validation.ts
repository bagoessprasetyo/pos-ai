import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address')
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters')
export const phoneSchema = z.string().optional()

// Product validation
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  cost: z.number().min(0, 'Cost must be non-negative').optional(),
  category_id: z.string().optional(),
  weight: z.number().min(0, 'Weight must be non-negative').optional(),
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    unit: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  tax_exempt: z.boolean(),
  track_inventory: z.boolean(),
})

// Category validation
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  parent_id: z.string().optional(),
  image_url: z.string().optional(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
})

// Store validation
export const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  tax_rate: z.number().min(0).max(1, 'Tax rate must be between 0 and 1').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  timezone: z.string().optional(),
})

// Auth validation
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(1, 'Full name is required'),
})

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

// Profile validation schemas
export const profileUpdateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z.string().optional().refine((val) => {
    if (!val) return true
    return /^\+?[\d\s\-()]+$/.test(val) && val.replace(/[\s\-()]/g, '').length >= 10
  }, 'Please enter a valid phone number'),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const avatarUploadSchema = z.object({
  file: z.instanceof(File).refine((file) => {
    return file.size <= 5 * 1024 * 1024 // 5MB
  }, 'File size must be less than 5MB').refine((file) => {
    return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  }, 'File must be a JPEG, PNG, or WebP image'),
})

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: phoneSchema,
})

// Transaction validation
export const paymentSchema = z.object({
  method: z.enum(['cash', 'card', 'digital_wallet', 'store_credit', 'other']),
  amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  reference: z.string().optional(),
})

export const transactionSchema = z.object({
  customer_id: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().int().min(1),
    unit_price: z.number().min(0),
    discount_amount: z.number().min(0).optional(),
  })).min(1, 'At least one item is required'),
  payments: z.array(paymentSchema).min(1, 'At least one payment is required'),
  notes: z.string().optional(),
})

// Helper functions for validation
export function validateSKU(sku: string, existingSkus: string[] = []): string | null {
  if (!sku) return null
  
  if (sku.length < 3) return 'SKU must be at least 3 characters'
  if (existingSkus.includes(sku)) return 'SKU already exists'
  
  return null
}

export function validateBarcode(barcode: string): string | null {
  if (!barcode) return null
  
  // Basic barcode validation (can be enhanced for specific formats)
  if (!/^\d+$/.test(barcode)) return 'Barcode must contain only numbers'
  if (barcode.length < 8) return 'Barcode must be at least 8 digits'
  
  return null
}

export function validateInventoryQuantity(quantity: number): string | null {
  if (quantity < 0) return 'Quantity cannot be negative'
  if (!Number.isInteger(quantity)) return 'Quantity must be a whole number'
  
  return null
}