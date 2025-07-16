import type { Database } from '@/lib/supabase'
import type { 
  ProductData, 
  CategoryData, 
  StoreData, 
  TransactionData, 
  CustomerData, 
  StaffData,
  PaymentData,
  DiscountData 
} from '@/utils/validation'

// Re-export Database type
export type { Database }

// Re-export validation types for better integration
export type {
  ProductData,
  CategoryData,
  StoreData,
  TransactionData,
  CustomerData,
  StaffData,
  PaymentData,
  DiscountData
} from '@/utils/validation'

// Database table types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Store = Database['public']['Tables']['stores']['Row']
export type StoreStaff = Database['public']['Tables']['store_staff']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TableArea = Database['public']['Tables']['table_areas']['Row']
export type Table = Database['public']['Tables']['tables']['Row']
export type TableReservation = Database['public']['Tables']['table_reservations']['Row']
export type TableSession = Database['public']['Tables']['table_sessions']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type StoreInsert = Database['public']['Tables']['stores']['Insert']
export type StoreStaffInsert = Database['public']['Tables']['store_staff']['Insert']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TableAreaInsert = Database['public']['Tables']['table_areas']['Insert']
export type TableInsert = Database['public']['Tables']['tables']['Insert']
export type TableReservationInsert = Database['public']['Tables']['table_reservations']['Insert']
export type TableSessionInsert = Database['public']['Tables']['table_sessions']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type StoreUpdate = Database['public']['Tables']['stores']['Update']
export type StoreStaffUpdate = Database['public']['Tables']['store_staff']['Update']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
export type TableAreaUpdate = Database['public']['Tables']['table_areas']['Update']
export type TableUpdate = Database['public']['Tables']['tables']['Update']
export type TableReservationUpdate = Database['public']['Tables']['table_reservations']['Update']
export type TableSessionUpdate = Database['public']['Tables']['table_sessions']['Update']

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

// Staff member with profile information
export interface StaffMember extends StoreStaff {
  profile: Profile
  stores?: Store[]
}

export interface StaffMemberWithProfile {
  id: string
  store_id: string
  user_id: string
  role: 'owner' | 'manager' | 'cashier' | 'kitchen' | 'viewer'
  permissions: any | null
  is_active: boolean
  created_at: string
  updated_at: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  hourly_rate?: number
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
  is_active?: boolean
  is_featured?: boolean
  tax_exempt?: boolean
  track_inventory?: boolean
  min_stock_level?: number
  max_stock_level?: number
  reorder_point?: number
}

export interface CategoryFormData {
  name: string
  description?: string
  parent_id?: string
  image_url?: string
  sort_order?: number
  is_active?: boolean
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
  service_type?: ServiceType
  table_id?: string | null
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
  KITCHEN_QUEUE = 'kitchen_queue',
  PREPARING = 'preparing',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  KITCHEN = 'kitchen',
  VIEWER = 'viewer'
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y'
}

export enum KitchenOrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  COMPLETED = 'completed'
}

export enum KitchenOrderPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
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

// Kitchen order types
export interface KitchenOrder {
  id: string
  transaction_id: string
  store_id: string
  order_number: string
  status: KitchenOrderStatus
  priority: KitchenOrderPriority
  estimated_prep_time?: number
  actual_prep_time?: number
  special_instructions?: string
  assigned_to?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface KitchenOrderWithTransaction extends KitchenOrder {
  transaction: TransactionWithItems
  assigned_staff?: Profile
}

export interface KitchenOrderInsert {
  transaction_id: string
  store_id: string
  order_number: string
  status?: KitchenOrderStatus
  priority?: KitchenOrderPriority
  estimated_prep_time?: number
  special_instructions?: string
  assigned_to?: string
}

export interface KitchenOrderUpdate {
  status?: KitchenOrderStatus
  priority?: KitchenOrderPriority
  estimated_prep_time?: number
  actual_prep_time?: number
  special_instructions?: string
  assigned_to?: string
  started_at?: string
  completed_at?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errors?: string[]
  message?: string
}

export interface PaginatedResponse<T = any> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  error?: string
}

// Validation-aware types
export interface ValidatedData<T> {
  data: T
  isValid: boolean
  errors: Record<string, string[]>
}

export interface FormState<T> {
  data: T
  errors: Record<string, string>
  isDirty: boolean
  isValid: boolean
  isSubmitting: boolean
  touchedFields: Set<keyof T>
}

// Enhanced Product types with validation
export interface ProductWithValidation extends ProductData {
  id?: string
  created_at?: string
  updated_at?: string
  store_id?: string
}

export interface CategoryWithValidation extends CategoryData {
  id?: string
  created_at?: string
  updated_at?: string
  store_id?: string
}

// Inventory types
export interface InventoryItem {
  id: string
  product_id: string
  store_id: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  reorder_point: number
  max_stock_level: number
  last_counted_at: string | null
  cost_per_unit: number | null
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  product_id: string
  store_id: string
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer'
  quantity: number
  reference_type: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'damage' | 'expired'
  reference_id: string | null
  notes: string | null
  performed_by: string
  performed_at: string
}

// Enhanced Customer types
export interface Customer {
  id: string
  store_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: {
    street?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  } | null
  date_of_birth: string | null
  notes: string | null
  tags: string[]
  is_active: boolean
  loyalty_points: number
  total_spent: number
  visit_count: number
  last_visit: string | null
  created_at: string
  updated_at: string
}

// Permission types
export interface Permission {
  action: string
  resource: string
  conditions?: Record<string, any>
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  is_system: boolean
  created_at: string
  updated_at: string
}

// Search and filter types
export interface SearchFilters {
  query?: string
  category_id?: string
  price_min?: number
  price_max?: number
  is_active?: boolean
  is_featured?: boolean
  has_inventory?: boolean
  tags?: string[]
  date_from?: string
  date_to?: string
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

// Upload types
export interface FileUpload {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  url?: string
  error?: string
}

// Notification types
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  actions?: Array<{
    label: string
    action: () => void
  }>
}

// Analytics types
export interface AnalyticsDateRange {
  start: string
  end: string
  preset?: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
}

export interface SalesTrend {
  date: string
  sales: number
  transactions: number
  customers: number
  items_sold: number
}

export interface ProductPerformance {
  product_id: string
  product_name: string
  quantity_sold: number
  revenue: number
  profit: number
  growth_rate: number
}

export interface CategoryPerformance {
  category_id: string
  category_name: string
  product_count: number
  revenue: number
  percentage_of_total: number
}

// Utility types for better type safety
export type NonEmptyArray<T> = [T, ...T[]]

export type StrictPick<T, K extends keyof T> = {
  [P in K]: T[P]
}

export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

// Database operation types
export type DatabaseInsert<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>
export type DatabaseUpdate<T> = Partial<DatabaseInsert<T>>

// Hook return types for better consistency
export interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  reset: () => void
}

export interface UseFormReturn<T> {
  data: T
  errors: Record<keyof T, string>
  isDirty: boolean
  isValid: boolean
  isSubmitting: boolean
  handleChange: (field: keyof T, value: any) => void
  handleSubmit: (onSubmit: (data: T) => Promise<void> | void) => Promise<void>
  reset: (data?: T) => void
  validate: () => boolean
  validateField: (field: keyof T) => boolean
}

// Export utility types for validation
export type ValidationResult<T> = {
  success: true
  data: T
} | {
  success: false
  errors: string[]
}

// Enhanced Cart types with validation
export interface ValidatedCartItem extends CartItem {
  validation: {
    isValid: boolean
    errors: string[]
  }
}

export interface CartSummary {
  items: CartItem[]
  subtotal: number
  tax_amount: number
  discount_amount: number
  tip_amount: number
  total: number
  item_count: number
  unique_items: number
}

// Event types for better event handling
export interface StoreEvent {
  type: 'product_updated' | 'inventory_changed' | 'transaction_completed' | 'user_login'
  payload: any
  timestamp: string
  source: string
}

// Configuration types
export interface AppConfig {
  features: {
    inventory_tracking: boolean
    loyalty_program: boolean
    multi_currency: boolean
    analytics: boolean
    ai_insights: boolean
  }
  limits: {
    max_products: number
    max_categories: number
    max_staff: number
    max_file_size: number
  }
  integrations: {
    payment_gateways: string[]
    accounting_software: string[]
    shipping_providers: string[]
  }
}

// Error types for better error handling
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
  context?: Record<string, any>
}

export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'UNKNOWN_ERROR'

// Table layout management types
// export enum TableStatus {
//   AVAILABLE = 'available',
//   OCCUPIED = 'occupied',
//   RESERVED = 'reserved',
//   CLEANING = 'cleaning',
//   OUT_OF_SERVICE = 'out_of_service'
// }

// export type TableShape = 'rectangle' | 'circle' | 'square'
//   RECTANGLE = 'rectangle',
//   CIRCLE = 'circle',
//   SQUARE = 'square'
// }

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SEATED = 'seated',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

export type ServiceType = 'takeout' | 'dine_in' | 'delivery'

// Table-related types
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service'
export type TableShape = 'rectangle' | 'circle' | 'square'

// Table position interface
export interface TablePosition {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

// Extended table types with relations
export interface TableWithArea extends Table {
  area?: TableArea | null
}

export interface TableWithSession extends Table {
  current_session?: TableSession | null
  area?: TableArea | null
}

export interface TableAreaWithTables extends TableArea {
  tables: Table[]
}

export interface ReservationWithDetails extends TableReservation {
  tables: TableWithArea
}

export interface SessionWithDetails extends TableSession {
  tables: TableWithArea
}

// Table layout management interfaces
export interface TableLayoutDesigner {
  areas: TableAreaWithTables[]
  selectedTable?: Table | null
  selectedArea?: TableArea | null
  mode: 'select' | 'add_table' | 'add_area' | 'edit'
  grid_size: number
  zoom: number
}

export interface TableFormData {
  table_number: string
  seats: number
  min_party_size: number
  max_party_size?: number
  shape: TableShape
  notes?: string
  position?: TablePosition
  area_id?: string
}

export interface TableAreaFormData {
  name: string
  description?: string
  color: string
  sort_order: number
}

export interface ReservationFormData {
  table_id: string
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  party_size: number
  reservation_time: string
  duration_minutes: number
  special_requests?: string
  notes?: string
}

export interface TableSessionFormData {
  table_id: string
  reservation_id?: string
  party_size: number
  estimated_duration: number
  notes?: string
}

// Table analytics and reporting
export interface TableUtilization {
  table_id: string
  table_number: string
  area_name: string
  total_sessions: number
  total_duration_minutes: number
  average_duration_minutes: number
  utilization_percentage: number
  revenue: number
}

export interface TableTurnover {
  date: string
  table_id: string
  table_number: string
  turns: number
  avg_duration: number
  total_revenue: number
}

export interface DiningAreaStats {
  area_id: string
  area_name: string
  total_tables: number
  occupied_tables: number
  available_tables: number
  cleaning_tables: number
  out_of_service_tables: number
  utilization_rate: number
}

// Store settings for dine-in service
export interface DineInSettings {
  enabled: boolean
  default_service_time: number
  auto_table_cleanup: boolean
  reservation_window_days: number
  require_reservations: boolean
  walk_in_enabled: boolean
  table_numbering_style: 'numeric' | 'alphanumeric' | 'custom'
}