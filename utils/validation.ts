import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address').max(255, 'Email too long')

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine((password) => /[A-Z]/.test(password), 'Password must contain at least one uppercase letter')
  .refine((password) => /[a-z]/.test(password), 'Password must contain at least one lowercase letter')
  .refine((password) => /\d/.test(password), 'Password must contain at least one number')

export const phoneSchema = z.string()
  .optional()
  .refine((val) => {
    if (!val) return true
    // Enhanced phone validation with international support
    const cleaned = val.replace(/[\s\-().]/g, '')
    return /^\+?[\d]{10,15}$/.test(cleaned)
  }, 'Please enter a valid phone number')

export const uuidSchema = z.string().uuid('Invalid ID format')

export const slugSchema = z.string()
  .min(1, 'Slug is required')
  .max(100, 'Slug too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')

export const urlSchema = z.string().url('Invalid URL format').optional().or(z.literal(''))

export const currencySchema = z.string()
  .length(3, 'Currency code must be exactly 3 characters')
  .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters')

export const localeSchema = z.string()
  .regex(/^[a-z]{2}-[A-Z]{2}$/, 'Locale must be in format xx-XX (e.g., en-US)')

export const colorHexSchema = z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code')

// Monetary value validation
export const monetarySchema = z.number()
  .min(0, 'Amount must be non-negative')
  .max(999999.99, 'Amount too large')
  .refine((val) => Number.isFinite(val), 'Invalid amount')
  .refine((val) => {
    const rounded = Math.round(val * 100) / 100
    return Math.abs(val - rounded) < 0.001
  }, 'Amount can only have up to 2 decimal places')

// Percentage validation
export const percentageSchema = z.number()
  .min(0, 'Percentage must be non-negative')
  .max(100, 'Percentage cannot exceed 100%')

// Coordinate validation
export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
})

// File validation
export const imageFileSchema = z.instanceof(File)
  .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
  .refine((file) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type), 
    'File must be a JPEG, PNG, WebP, or GIF image')

// Product validation
export const productSchema = z.object({
  name: z.string()
    .min(1, 'Product name is required')
    .max(255, 'Product name too long')
    .trim(),
  description: z.string()
    .max(2000, 'Description too long')
    .optional()
    .transform((val) => val?.trim() || undefined),
  sku: z.string()
    .min(3, 'SKU must be at least 3 characters')
    .max(50, 'SKU too long')
    .regex(/^[A-Z0-9\-_]+$/i, 'SKU can only contain letters, numbers, hyphens, and underscores')
    .optional()
    .transform((val) => val?.trim().toUpperCase()),
  barcode: z.string()
    .min(8, 'Barcode must be at least 8 digits')
    .max(20, 'Barcode too long')
    .regex(/^\d+$/, 'Barcode must contain only numbers')
    .optional(),
  price: monetarySchema,
  cost: monetarySchema.optional(),
  category_id: uuidSchema.optional(),
  weight: z.number()
    .min(0, 'Weight must be non-negative')
    .max(999999, 'Weight too large')
    .optional(),
  dimensions: z.object({
    length: z.number().min(0).max(99999).optional(),
    width: z.number().min(0).max(99999).optional(),
    height: z.number().min(0).max(99999).optional(),
    unit: z.enum(['mm', 'cm', 'm', 'in', 'ft']).optional(),
  }).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20, 'Too many tags').optional(),
  images: z.array(z.string().url('Invalid URL format')).max(10, 'Too many images').optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  tax_exempt: z.boolean().default(false),
  track_inventory: z.boolean().default(true),
  min_stock_level: z.number().int().min(0).max(999999).optional(),
  max_stock_level: z.number().int().min(0).max(999999).optional(),
  reorder_point: z.number().int().min(0).max(999999).optional(),
}).refine((data) => {
  if (data.cost && data.price && data.cost > data.price) {
    return false
  }
  return true
}, {
  message: 'Cost cannot be greater than price',
  path: ['cost']
}).refine((data) => {
  if (data.min_stock_level && data.max_stock_level && data.min_stock_level > data.max_stock_level) {
    return false
  }
  return true
}, {
  message: 'Minimum stock level cannot be greater than maximum stock level',
  path: ['min_stock_level']
})

// Category validation
export const categorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name too long')
    .trim(),
  description: z.string()
    .max(500, 'Description too long')
    .optional()
    .transform((val) => val?.trim() || undefined),
  parent_id: uuidSchema.optional(),
  image_url: urlSchema.optional(),
  color: colorHexSchema.optional(),
  sort_order: z.number().int().min(0).max(999999).default(0),
  is_active: z.boolean().default(true),
  slug: slugSchema.optional(),
})

// Store validation
export const addressSchema = z.object({
  street: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().length(2, 'Country must be 2-letter code').optional(),
})

export const storeSettingsSchema = z.object({
  currency: currencySchema.default('USD'),
  locale: localeSchema.default('en-US'),
  timezone: z.string().default('UTC'),
  tax_rate: percentageSchema.transform((val) => val / 100).default(0),
  business_hours: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
  }).optional(),
  receipt_settings: z.object({
    header_text: z.string().max(200).optional(),
    footer_text: z.string().max(200).optional(),
    show_logo: z.boolean().default(true),
    show_barcode: z.boolean().default(true),
  }).optional(),
})

export const storeSchema = z.object({
  name: z.string()
    .min(1, 'Store name is required')
    .max(255, 'Store name too long')
    .trim(),
  description: z.string()
    .max(1000, 'Description too long')
    .optional()
    .transform((val) => val?.trim() || undefined),
  address: addressSchema.optional(),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  website: urlSchema.optional(),
  logo_url: urlSchema.optional(),
  coordinates: coordinateSchema.optional(),
  settings: storeSettingsSchema.optional(),
  is_active: z.boolean().default(true),
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
export const paymentMethodSchema = z.enum([
  'cash', 
  'card', 
  'debit_card', 
  'credit_card',
  'digital_wallet', 
  'store_credit', 
  'gift_card',
  'bank_transfer',
  'other'
])

export const paymentSchema = z.object({
  method: paymentMethodSchema,
  amount: monetarySchema,
  reference: z.string().max(100).optional(),
  card_last_four: z.string().length(4).regex(/^\d{4}$/).optional(),
  approval_code: z.string().max(50).optional(),
  gateway_transaction_id: z.string().max(255).optional(),
  processed_at: z.date().optional(),
})

export const transactionItemSchema = z.object({
  product_id: uuidSchema,
  quantity: z.number().int().min(1).max(999999),
  unit_price: monetarySchema,
  discount_amount: monetarySchema.default(0),
  tax_amount: monetarySchema.default(0),
  line_total: monetarySchema,
  notes: z.string().max(500).optional(),
}).refine((data) => {
  const expectedTotal = (data.unit_price * data.quantity) - data.discount_amount + data.tax_amount
  return Math.abs(data.line_total - expectedTotal) < 0.01
}, {
  message: 'Line total does not match calculated total',
  path: ['line_total']
})

export const discountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y']),
  value: z.number().min(0),
  conditions: z.object({
    min_amount: monetarySchema.optional(),
    min_quantity: z.number().int().min(1).optional(),
    product_ids: z.array(uuidSchema).optional(),
    category_ids: z.array(uuidSchema).optional(),
    customer_groups: z.array(z.string()).optional(),
  }).optional(),
  valid_from: z.date().optional(),
  valid_until: z.date().optional(),
  max_uses: z.number().int().min(1).optional(),
  max_uses_per_customer: z.number().int().min(1).optional(),
  is_active: z.boolean().default(true),
})

export const customerSchema = z.object({
  first_name: z.string().min(1).max(50).trim(),
  last_name: z.string().min(1).max(50).trim(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  address: addressSchema.optional(),
  date_of_birth: z.date().max(new Date()).optional(),
  notes: z.string().max(1000).optional(),
  is_active: z.boolean().default(true),
  loyalty_points: z.number().int().min(0).default(0),
  total_spent: monetarySchema.default(0),
  visit_count: z.number().int().min(0).default(0),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
})

export const transactionSchema = z.object({
  customer_id: uuidSchema.optional(),
  transaction_number: z.string().min(1).max(50),
  items: z.array(transactionItemSchema).min(1, 'At least one item is required'),
  payments: z.array(paymentSchema).min(1, 'At least one payment is required'),
  subtotal: monetarySchema,
  tax_amount: monetarySchema.default(0),
  discount_amount: monetarySchema.default(0),
  tip_amount: monetarySchema.default(0),
  total: monetarySchema,
  notes: z.string().max(1000).optional(),
  status: z.enum(['pending', 'completed', 'cancelled', 'refunded']).default('pending'),
  processed_at: z.date().optional(),
  cashier_id: uuidSchema.optional(),
}).refine((data) => {
  const calculatedTotal = data.subtotal + data.tax_amount - data.discount_amount + data.tip_amount
  return Math.abs(data.total - calculatedTotal) < 0.01
}, {
  message: 'Total does not match calculated amount',
  path: ['total']
}).refine((data) => {
  const paymentTotal = data.payments.reduce((sum, payment) => sum + payment.amount, 0)
  return Math.abs(paymentTotal - data.total) < 0.01
}, {
  message: 'Payment total does not match transaction total',
  path: ['payments']
})

// Inventory validation
export const inventoryAdjustmentSchema = z.object({
  product_id: uuidSchema,
  adjustment_type: z.enum(['increase', 'decrease', 'set', 'recount']),
  quantity: z.number().int().min(-999999).max(999999),
  reason: z.enum([
    'received_shipment',
    'sold',
    'damaged',
    'expired',
    'theft',
    'recount',
    'transfer',
    'return',
    'other'
  ]),
  notes: z.string().max(500).optional(),
  reference_number: z.string().max(100).optional(),
  cost_per_unit: monetarySchema.optional(),
})

export const stockMovementSchema = z.object({
  product_id: uuidSchema,
  from_location: z.string().max(100).optional(),
  to_location: z.string().max(100).optional(),
  quantity: z.number().int().min(1),
  movement_type: z.enum(['transfer', 'adjustment', 'sale', 'return', 'damage', 'expired']),
  notes: z.string().max(500).optional(),
  performed_by: uuidSchema,
})

// Staff validation
export const staffRoleSchema = z.enum([
  'owner',
  'manager', 
  'supervisor',
  'cashier',
  'sales_associate',
  'inventory_clerk',
  'custom'
])

export const staffPermissionSchema = z.object({
  can_view_analytics: z.boolean().default(false),
  can_manage_products: z.boolean().default(false),
  can_manage_categories: z.boolean().default(false),
  can_manage_inventory: z.boolean().default(false),
  can_process_transactions: z.boolean().default(true),
  can_process_returns: z.boolean().default(false),
  can_apply_discounts: z.boolean().default(false),
  can_modify_prices: z.boolean().default(false),
  can_access_register: z.boolean().default(true),
  can_manage_customers: z.boolean().default(false),
  can_view_reports: z.boolean().default(false),
  can_manage_staff: z.boolean().default(false),
  can_manage_settings: z.boolean().default(false),
  max_discount_percentage: percentageSchema.default(0),
  max_transaction_amount: monetarySchema.optional(),
})

export const staffSchema = z.object({
  user_id: uuidSchema,
  role: staffRoleSchema,
  permissions: staffPermissionSchema.optional(),
  hourly_rate: monetarySchema.optional(),
  hire_date: z.date().optional(),
  notes: z.string().max(1000).optional(),
  is_active: z.boolean().default(true),
  can_login: z.boolean().default(true),
  pin_code: z.string().length(4).regex(/^\d{4}$/).optional(),
})

// API validation schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort_by: z.string().max(50).optional(),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
})

export const searchSchema = z.object({
  query: z.string().max(255).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  include_inactive: z.boolean().default(false),
})

export const bulkOperationSchema = z.object({
  operation: z.enum(['delete', 'activate', 'deactivate', 'update', 'export']),
  ids: z.array(uuidSchema).min(1, 'At least one item must be selected'),
  data: z.record(z.string(), z.any()).optional(),
})

// Helper functions for validation
export function validateSKU(sku: string, existingSkus: string[] = []): string | null {
  if (!sku) return null
  
  try {
    z.string()
      .min(3, 'SKU must be at least 3 characters')
      .max(50, 'SKU too long')
      .regex(/^[A-Z0-9\-_]+$/i, 'SKU can only contain letters, numbers, hyphens, and underscores')
      .optional()
      .transform((val) => val?.trim().toUpperCase())
      .parse(sku)
    if (existingSkus.includes(sku.toUpperCase())) {
      return 'SKU already exists'
    }
    return null
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid SKU'
    }
    return 'Invalid SKU'
  }
}

export function validateBarcode(barcode: string, existingBarcodes: string[] = []): string | null {
  if (!barcode) return null
  
  try {
    z.string()
      .min(8, 'Barcode must be at least 8 digits')
      .max(20, 'Barcode too long')
      .regex(/^\d+$/, 'Barcode must contain only numbers')
      .optional()
      .parse(barcode)
    if (existingBarcodes.includes(barcode)) {
      return 'Barcode already exists'
    }
    return null
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid barcode'
    }
    return 'Invalid barcode'
  }
}

export function validateInventoryQuantity(quantity: number): string | null {
  try {
    z.number().int().min(0).max(999999).parse(quantity)
    return null
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid quantity'
    }
    return 'Invalid quantity'
  }
}

export function validateEmail(email: string): string | null {
  try {
    emailSchema.parse(email)
    return null
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid email'
    }
    return 'Invalid email'
  }
}

export function validatePrice(price: number): string | null {
  try {
    monetarySchema.parse(price)
    return null
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid price'
    }
    return 'Invalid price'
  }
}

// Type-safe validation wrapper
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: string[]
} {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => err.message)
      }
    }
    return {
      success: false,
      errors: ['Validation failed']
    }
  }
}

// Async validation for unique constraints
export async function validateUnique<T>(
  value: T,
  checkFunction: (value: T) => Promise<boolean>,
  errorMessage: string = 'Value must be unique'
): Promise<string | null> {
  try {
    const isUnique = await checkFunction(value)
    return isUnique ? null : errorMessage
  } catch {
    return 'Unable to validate uniqueness'
  }
}

// Custom validation rules
export const customValidators = {
  businessHours: (hours: string) => {
    if (!hours) return null
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(hours) ? null : 'Invalid time format (HH:MM)'
  },
  
  taxId: (taxId: string) => {
    if (!taxId) return null
    // Basic tax ID validation - can be enhanced for specific countries
    return taxId.length >= 5 && taxId.length <= 20 ? null : 'Invalid tax ID'
  },
  
  creditCard: (cardNumber: string) => {
    if (!cardNumber) return null
    const cleaned = cardNumber.replace(/\D/g, '')
    if (cleaned.length < 13 || cleaned.length > 19) {
      return 'Invalid card number length'
    }
    // Luhn algorithm validation
    let sum = 0
    let isEven = false
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i])
      if (isEven) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      isEven = !isEven
    }
    return sum % 10 === 0 ? null : 'Invalid card number'
  },
}

// Type exports for better TypeScript integration
export type ProductData = z.infer<typeof productSchema>
export type CategoryData = z.infer<typeof categorySchema>
export type StoreData = z.infer<typeof storeSchema>
export type TransactionData = z.infer<typeof transactionSchema>
export type CustomerData = z.infer<typeof customerSchema>
export type StaffData = z.infer<typeof staffSchema>
export type InventoryAdjustmentData = z.infer<typeof inventoryAdjustmentSchema>
export type PaymentData = z.infer<typeof paymentSchema>
export type DiscountData = z.infer<typeof discountSchema>