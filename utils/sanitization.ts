// Data sanitization utilities for enhanced type safety

export const sanitizers = {
  // String sanitization
  string: {
    trim: (value: string): string => value.trim(),
    
    removeExtraWhitespace: (value: string): string => 
      value.replace(/\s+/g, ' ').trim(),
    
    removeSpecialChars: (value: string, allowed: string = ''): string =>
      value.replace(new RegExp(`[^\\w\\s${allowed}]`, 'g'), ''),
    
    normalizeEmail: (email: string): string =>
      email.toLowerCase().trim(),
    
    normalizePhone: (phone: string): string =>
      phone.replace(/[\s\-().]/g, ''),
    
    capitalizeWords: (value: string): string =>
      value.replace(/\b\w/g, char => char.toUpperCase()),
    
    slug: (value: string): string =>
      value
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    
    truncate: (value: string, maxLength: number): string =>
      value.length > maxLength ? value.substring(0, maxLength) : value
  },

  // Number sanitization
  number: {
    toPositive: (value: number): number => Math.max(0, value),
    
    roundToCurrency: (value: number, decimals: number = 2): number =>
      Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals),
    
    clamp: (value: number, min: number, max: number): number =>
      Math.min(Math.max(value, min), max),
    
    toInteger: (value: number): number => Math.floor(value),
    
    parseNumeric: (value: string): number => {
      const cleaned = value.replace(/[^0-9.-]/g, '')
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? 0 : parsed
    }
  },

  // Array sanitization
  array: {
    removeDuplicates: <T>(array: T[]): T[] => Array.from(new Set(array)),
    
    removeEmpty: <T>(array: (T | null | undefined)[]): T[] =>
      array.filter((item): item is T => item != null),
    
    trimStrings: (array: string[]): string[] =>
      array.map(str => str.trim()).filter(str => str.length > 0),
    
    limitLength: <T>(array: T[], maxLength: number): T[] =>
      array.slice(0, maxLength)
  },

  // Object sanitization
  object: {
    removeNullish: <T extends Record<string, any>>(obj: T): Partial<T> => {
      const result: Partial<T> = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value != null) {
          result[key as keyof T] = value
        }
      }
      return result
    },
    
    removeEmpty: <T extends Record<string, any>>(obj: T): Partial<T> => {
      const result: Partial<T> = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value != null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
          result[key as keyof T] = value
        }
      }
      return result
    },
    
    deepClean: <T extends Record<string, any>>(obj: T): Partial<T> => {
      const result: Partial<T> = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value != null) {
          if (typeof value === 'string') {
            const cleaned = value.trim()
            if (cleaned) result[key as keyof T] = cleaned as T[keyof T]
          } else if (Array.isArray(value)) {
            const cleaned = value.filter(item => item != null)
            if (cleaned.length > 0) result[key as keyof T] = cleaned as T[keyof T]
          } else if (typeof value === 'object') {
            const cleaned = sanitizers.object.deepClean(value)
            if (Object.keys(cleaned).length > 0) result[key as keyof T] = cleaned as T[keyof T]
          } else {
            result[key as keyof T] = value
          }
        }
      }
      return result
    }
  },

  // File sanitization
  file: {
    sanitizeFilename: (filename: string): string =>
      filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, ''),
    
    getFileExtension: (filename: string): string => {
      const ext = filename.split('.').pop()
      return ext ? ext.toLowerCase() : ''
    },
    
    validateImageType: (file: File): boolean =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
  },

  // Date sanitization
  date: {
    toISOString: (date: Date | string): string => {
      if (typeof date === 'string') {
        return new Date(date).toISOString()
      }
      return date.toISOString()
    },
    
    startOfDay: (date: Date): Date => {
      const newDate = new Date(date)
      newDate.setHours(0, 0, 0, 0)
      return newDate
    },
    
    endOfDay: (date: Date): Date => {
      const newDate = new Date(date)
      newDate.setHours(23, 59, 59, 999)
      return newDate
    }
  }
}

// Composite sanitizers for common use cases
export const compositeSanitizers = {
  // Product data sanitization
  product: (data: any) => ({
    ...data,
    name: sanitizers.string.removeExtraWhitespace(data.name || ''),
    description: data.description ? sanitizers.string.removeExtraWhitespace(data.description) : undefined,
    sku: data.sku ? sanitizers.string.trim(data.sku).toUpperCase() : undefined,
    barcode: data.barcode ? sanitizers.string.removeSpecialChars(data.barcode, '') : undefined,
    price: sanitizers.number.roundToCurrency(Math.max(0, Number(data.price) || 0)),
    cost: data.cost ? sanitizers.number.roundToCurrency(Math.max(0, Number(data.cost) || 0)) : undefined,
    weight: data.weight ? sanitizers.number.toPositive(Number(data.weight) || 0) : undefined,
    tags: data.tags ? sanitizers.array.trimStrings(data.tags).slice(0, 20) : undefined,
    images: data.images ? sanitizers.array.removeEmpty(data.images).slice(0, 10) : undefined
  }),

  // Category data sanitization
  category: (data: any) => ({
    ...data,
    name: sanitizers.string.removeExtraWhitespace(data.name || ''),
    description: data.description ? sanitizers.string.removeExtraWhitespace(data.description) : undefined,
    slug: data.slug || sanitizers.string.slug(data.name || ''),
    sort_order: sanitizers.number.toInteger(Math.max(0, Number(data.sort_order) || 0))
  }),

  // Customer data sanitization
  customer: (data: any) => ({
    ...data,
    first_name: sanitizers.string.capitalizeWords(sanitizers.string.removeExtraWhitespace(data.first_name || '')),
    last_name: sanitizers.string.capitalizeWords(sanitizers.string.removeExtraWhitespace(data.last_name || '')),
    email: data.email ? sanitizers.string.normalizeEmail(data.email) : undefined,
    phone: data.phone ? sanitizers.string.normalizePhone(data.phone) : undefined,
    notes: data.notes ? sanitizers.string.removeExtraWhitespace(data.notes) : undefined,
    tags: data.tags ? sanitizers.array.trimStrings(data.tags).slice(0, 10) : undefined
  }),

  // Transaction data sanitization
  transaction: (data: any) => ({
    ...data,
    subtotal: sanitizers.number.roundToCurrency(Number(data.subtotal) || 0),
    tax_amount: sanitizers.number.roundToCurrency(Math.max(0, Number(data.tax_amount) || 0)),
    discount_amount: sanitizers.number.roundToCurrency(Math.max(0, Number(data.discount_amount) || 0)),
    tip_amount: sanitizers.number.roundToCurrency(Math.max(0, Number(data.tip_amount) || 0)),
    total: sanitizers.number.roundToCurrency(Number(data.total) || 0),
    notes: data.notes ? sanitizers.string.removeExtraWhitespace(data.notes) : undefined,
    items: data.items ? data.items.map((item: any) => ({
      ...item,
      quantity: sanitizers.number.toInteger(Math.max(1, Number(item.quantity) || 1)),
      unit_price: sanitizers.number.roundToCurrency(Math.max(0, Number(item.unit_price) || 0)),
      discount_amount: sanitizers.number.roundToCurrency(Math.max(0, Number(item.discount_amount) || 0)),
      tax_amount: sanitizers.number.roundToCurrency(Math.max(0, Number(item.tax_amount) || 0)),
      line_total: sanitizers.number.roundToCurrency(Number(item.line_total) || 0)
    })) : [],
    payments: data.payments ? data.payments.map((payment: any) => ({
      ...payment,
      amount: sanitizers.number.roundToCurrency(Math.max(0, Number(payment.amount) || 0)),
      reference: payment.reference ? sanitizers.string.trim(payment.reference) : undefined
    })) : []
  }),

  // Store data sanitization
  store: (data: any) => ({
    ...data,
    name: sanitizers.string.removeExtraWhitespace(data.name || ''),
    description: data.description ? sanitizers.string.removeExtraWhitespace(data.description) : undefined,
    email: data.email ? sanitizers.string.normalizeEmail(data.email) : undefined,
    phone: data.phone ? sanitizers.string.normalizePhone(data.phone) : undefined,
    website: data.website ? sanitizers.string.trim(data.website) : undefined
  })
}

// Type-safe sanitization wrapper
export function sanitizeData<T>(data: T, sanitizer: (data: any) => any): T {
  try {
    return sanitizer(data) as T
  } catch (error) {
    console.warn('Sanitization failed:', error)
    return data
  }
}

// Validation and sanitization pipeline
export function validateAndSanitize<T>(
  data: any,
  sanitizer: (data: any) => any,
  validator: (data: any) => { success: boolean; data?: T; errors?: string[] }
): { success: boolean; data?: T; errors?: string[] } {
  try {
    // First sanitize the data
    const sanitizedData = sanitizer(data)
    
    // Then validate the sanitized data
    return validator(sanitizedData)
  } catch (error) {
    return {
      success: false,
      errors: ['Data processing failed']
    }
  }
}

// Input sanitization for security
export const securitySanitizers = {
  // Remove potential XSS vectors
  xss: (input: string): string =>
    input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, ''),

  // SQL injection prevention (basic)
  sql: (input: string): string =>
    input
      .replace(/[';\"\\]/g, '')
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE)\b/gi, ''),

  // HTML encode
  html: (input: string): string =>
    input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;'),

  // URL sanitization
  url: (input: string): string => {
    try {
      const url = new URL(input)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return ''
      }
      return url.toString()
    } catch {
      return ''
    }
  }
}

export default sanitizers