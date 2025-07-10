import type { Database } from '@/lib/supabase'

// Re-export Database type
export type { Database }

// Database table types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Store = Database['public']['Tables']['stores']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type StoreInsert = Database['public']['Tables']['stores']['Insert']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type StoreUpdate = Database['public']['Tables']['stores']['Update']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

// Extended types with relations
export interface ProductWithCategory extends Product {
  category?: Category | null
}

export interface ProductWithInventory extends Product {
  inventory?: {
    quantity: number
    reserved_quantity: number
    reorder_point: number
  } | null
}

export interface TransactionWithItems extends Transaction {
  transaction_items: Array<{
    id: string
    product_id: string
    quantity: number
    unit_price: number
    discount_amount: number
    tax_amount: number
    line_total: number
    product: Product
  }>
  payments: Array<{
    id: string
    method: string
    amount: number
    reference?: string
  }>
}

// Form types
export interface ProductFormData {
  name: string
  description?: string
  sku?: string
  barcode?: string
  price: number
  cost?: number
  category_id?: string
  weight?: number
  dimensions?: {
    length?: number
    width?: number
    height?: number
    unit?: string
  }
  tags?: string[]
  images?: string[]
  is_active: boolean
  is_featured: boolean
  tax_exempt: boolean
  track_inventory: boolean
}

export interface CategoryFormData {
  name: string
  description?: string
  parent_id?: string
  image_url?: string
  sort_order: number
  is_active: boolean
}

export interface StoreFormData {
  name: string
  description?: string
  address?: string
  phone?: string
  email?: string
  tax_rate?: number
  currency?: string
  timezone?: string
}

// POS types
export interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  discount_amount: number
  line_total: number
}

export interface PaymentMethod {
  id: string
  name: string
  type: 'cash' | 'card' | 'digital_wallet' | 'store_credit' | 'other'
  enabled: boolean
}

export interface PosTransaction {
  items: CartItem[]
  customer_id?: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total: number
  payments: Array<{
    method: string
    amount: number
    reference?: string
  }>
  notes?: string
}

// Analytics types
export interface SalesMetrics {
  total_sales: number
  transaction_count: number
  average_transaction_value: number
  top_products: Array<{
    product_id: string
    product_name: string
    quantity_sold: number
    revenue: number
  }>
  daily_sales: Array<{
    date: string
    sales: number
    transactions: number
  }>
}

export interface InventoryAlert {
  product_id: string
  product_name: string
  current_quantity: number
  reorder_point: number
  status: 'low_stock' | 'out_of_stock'
}

// Enums
export enum TransactionType {
  SALE = 'sale',
  RETURN = 'return',
  VOID = 'void'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  VIEWER = 'viewer'
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y'
}

// Discount types
export interface Discount {
  id: string
  store_id: string
  name: string
  description: string | null
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y'
  value: number
  conditions: any
  applicable_to: 'all' | 'categories' | 'products'
  applicable_ids: string[]
  code: string | null
  start_date: string | null
  end_date: string | null
  usage_limit: number | null
  usage_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DiscountInsert = Omit<Discount, 'id' | 'created_at' | 'updated_at' | 'usage_count'>
export type DiscountUpdate = Partial<DiscountInsert>

export interface DiscountFormData {
  name: string
  description?: string
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y'
  value: number
  applicable_to: 'all' | 'categories' | 'products'
  applicable_ids?: string[]
  code?: string
  start_date?: string
  end_date?: string
  usage_limit?: number
  conditions?: {
    minimum_purchase?: number
    maximum_discount?: number
    buy_quantity?: number
    get_quantity?: number
    customer_groups?: string[]
  }
  is_active: boolean
}

export interface DiscountConditions {
  minimum_purchase?: number
  maximum_discount?: number
  buy_quantity?: number
  get_quantity?: number
  customer_groups?: string[]
}

export interface AppliedDiscount {
  discount: Discount
  amount: number
  applied_to: 'transaction' | 'item'
  item_ids?: string[]
}