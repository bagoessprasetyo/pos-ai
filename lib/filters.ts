export interface FilterConfig<T = any> {
  key: keyof T | string
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean' | 'multiSelect'
  label: string
  placeholder?: string
  options?: Array<{ value: string | number | boolean; label: string }>
  defaultValue?: any
  validation?: (value: any) => string | null
}

export interface FilterState {
  [key: string]: any
}

export interface FilterPreset {
  id: string
  name: string
  filters: FilterState
  isDefault?: boolean
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export interface SearchAndFilterState {
  query: string
  filters: FilterState
  sort: SortConfig
  page: number
  limit: number
}

// Filter application functions
export function applyFilters<T>(
  data: T[],
  filters: FilterState,
  configs: FilterConfig<T>[]
): T[] {
  return data.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return true // Skip empty filters
      }

      const config = configs.find(c => c.key === key)
      if (!config) return true

      const itemValue = getNestedValue(item, key)

      switch (config.type) {
        case 'text':
          return applyTextFilter(itemValue, value)
        case 'select':
          return applySelectFilter(itemValue, value)
        case 'multiSelect':
          return applyMultiSelectFilter(itemValue, value)
        case 'date':
          return applyDateFilter(itemValue, value)
        case 'dateRange':
          return applyDateRangeFilter(itemValue, value)
        case 'number':
          return applyNumberFilter(itemValue, value)
        case 'boolean':
          return applyBooleanFilter(itemValue, value)
        default:
          return true
      }
    })
  })
}

// Individual filter type implementations
function applyTextFilter(itemValue: any, filterValue: string): boolean {
  if (!itemValue) return false
  return String(itemValue).toLowerCase().includes(filterValue.toLowerCase())
}

function applySelectFilter(itemValue: any, filterValue: string | number): boolean {
  return itemValue === filterValue
}

function applyMultiSelectFilter(itemValue: any, filterValue: (string | number)[]): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true
  return filterValue.includes(itemValue)
}

function applyDateFilter(itemValue: any, filterValue: string): boolean {
  if (!itemValue) return false
  const itemDate = new Date(itemValue).toDateString()
  const filterDate = new Date(filterValue).toDateString()
  return itemDate === filterDate
}

function applyDateRangeFilter(itemValue: any, filterValue: { start: string; end: string }): boolean {
  if (!itemValue || !filterValue.start || !filterValue.end) return true
  
  const itemDate = new Date(itemValue)
  const startDate = new Date(filterValue.start)
  const endDate = new Date(filterValue.end)
  
  return itemDate >= startDate && itemDate <= endDate
}

function applyNumberFilter(itemValue: any, filterValue: { min?: number; max?: number }): boolean {
  if (!itemValue) return false
  
  const numValue = Number(itemValue)
  if (isNaN(numValue)) return false
  
  if (filterValue.min !== undefined && numValue < filterValue.min) return false
  if (filterValue.max !== undefined && numValue > filterValue.max) return false
  
  return true
}

function applyBooleanFilter(itemValue: any, filterValue: boolean): boolean {
  return Boolean(itemValue) === filterValue
}

// Search functionality
export function applySearch<T>(
  data: T[],
  query: string,
  searchFields: (keyof T | string)[]
): T[] {
  if (!query.trim()) return data
  
  const searchQuery = query.toLowerCase()
  
  return data.filter(item =>
    searchFields.some(field => {
      const value = getNestedValue(item, field as string)
      return value && String(value).toLowerCase().includes(searchQuery)
    })
  )
}

// Sorting functionality
export function applySorting<T>(
  data: T[],
  sort: SortConfig
): T[] {
  if (!sort.field) return data
  
  return [...data].sort((a, b) => {
    const aValue = getNestedValue(a, sort.field)
    const bValue = getNestedValue(b, sort.field)
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0
    if (aValue == null) return sort.direction === 'asc' ? -1 : 1
    if (bValue == null) return sort.direction === 'asc' ? 1 : -1
    
    // Compare values
    let comparison = 0
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue)
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime()
    } else {
      // Fallback to string comparison
      comparison = String(aValue).localeCompare(String(bValue))
    }
    
    return sort.direction === 'asc' ? comparison : -comparison
  })
}

// Pagination functionality
export function applyPagination<T>(
  data: T[],
  page: number,
  limit: number
): {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
} {
  const total = data.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  
  return {
    data: data.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}

// Combined search, filter, sort, and paginate
export function processData<T>(
  data: T[],
  state: SearchAndFilterState,
  filterConfigs: FilterConfig<T>[],
  searchFields: (keyof T | string)[]
) {
  // Apply search
  let processedData = applySearch(data, state.query, searchFields)
  
  // Apply filters
  processedData = applyFilters(processedData, state.filters, filterConfigs)
  
  // Apply sorting
  processedData = applySorting(processedData, state.sort)
  
  // Apply pagination
  return applyPagination(processedData, state.page, state.limit)
}

// Utility function to get nested values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

// Filter presets for common use cases
export const filterPresets = {
  products: [
    {
      id: 'active',
      name: 'Active Products',
      filters: { is_active: true },
      isDefault: true
    },
    {
      id: 'featured',
      name: 'Featured Products',
      filters: { is_featured: true, is_active: true }
    },
    {
      id: 'low_stock',
      name: 'Low Stock',
      filters: { stock_status: 'low' }
    },
    {
      id: 'out_of_stock',
      name: 'Out of Stock',
      filters: { stock_status: 'out' }
    }
  ] as FilterPreset[],

  transactions: [
    {
      id: 'today',
      name: 'Today',
      filters: {
        date_range: {
          start: new Date().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        }
      },
      isDefault: true
    },
    {
      id: 'this_week',
      name: 'This Week',
      filters: {
        date_range: {
          start: getStartOfWeek().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        }
      }
    },
    {
      id: 'this_month',
      name: 'This Month',
      filters: {
        date_range: {
          start: getStartOfMonth().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        }
      }
    },
    {
      id: 'completed',
      name: 'Completed',
      filters: { status: 'completed' }
    }
  ] as FilterPreset[],

  customers: [
    {
      id: 'active',
      name: 'Active Customers',
      filters: { is_active: true },
      isDefault: true
    },
    {
      id: 'vip',
      name: 'VIP Customers',
      filters: { 
        is_active: true,
        total_spent: { min: 1000 }
      }
    },
    {
      id: 'recent',
      name: 'Recent Customers',
      filters: {
        created_date: {
          start: getDateDaysAgo(30).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        }
      }
    }
  ] as FilterPreset[]
}

// Pre-configured filter configurations
export const filterConfigs = {
  products: [
    {
      key: 'category_id',
      type: 'select',
      label: 'Category',
      placeholder: 'All categories'
    },
    {
      key: 'is_active',
      type: 'boolean',
      label: 'Active',
      defaultValue: true
    },
    {
      key: 'is_featured',
      type: 'boolean',
      label: 'Featured'
    },
    {
      key: 'price',
      type: 'number',
      label: 'Price Range'
    },
    {
      key: 'created_at',
      type: 'dateRange',
      label: 'Created Date'
    }
  ] as FilterConfig[],

  transactions: [
    {
      key: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'refunded', label: 'Refunded' }
      ]
    },
    {
      key: 'created_at',
      type: 'dateRange',
      label: 'Date Range'
    },
    {
      key: 'total',
      type: 'number',
      label: 'Amount Range'
    },
    {
      key: 'payment_method',
      type: 'multiSelect',
      label: 'Payment Methods',
      options: [
        { value: 'cash', label: 'Cash' },
        { value: 'card', label: 'Card' },
        { value: 'digital_wallet', label: 'Digital Wallet' }
      ]
    }
  ] as FilterConfig[],

  customers: [
    {
      key: 'is_active',
      type: 'boolean',
      label: 'Active',
      defaultValue: true
    },
    {
      key: 'city',
      type: 'text',
      label: 'City',
      placeholder: 'Filter by city'
    },
    {
      key: 'total_spent',
      type: 'number',
      label: 'Total Spent'
    },
    {
      key: 'visit_count',
      type: 'number',
      label: 'Visit Count'
    },
    {
      key: 'created_at',
      type: 'dateRange',
      label: 'Registration Date'
    }
  ] as FilterConfig[]
}

// Utility functions for date calculations
function getStartOfWeek(): Date {
  const date = new Date()
  const diff = date.getDate() - date.getDay()
  return new Date(date.setDate(diff))
}

function getStartOfMonth(): Date {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getDateDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

// Save and load filter state
export const filterStateManager = {
  save: (key: string, state: SearchAndFilterState) => {
    try {
      localStorage.setItem(`filter_state_${key}`, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save filter state:', error)
    }
  },

  load: (key: string): SearchAndFilterState | null => {
    try {
      const saved = localStorage.getItem(`filter_state_${key}`)
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.warn('Failed to load filter state:', error)
      return null
    }
  },

  clear: (key: string) => {
    try {
      localStorage.removeItem(`filter_state_${key}`)
    } catch (error) {
      console.warn('Failed to clear filter state:', error)
    }
  }
}