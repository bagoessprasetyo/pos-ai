// Currency formatting utilities

export function formatPrice(
  amount: number, 
  options?: {
    currency?: string
    locale?: string
  }
): string {
  // Get default currency and locale from environment or fallback
  const defaultCurrency = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'USD'
  const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en-US'
  
  const currency = options?.currency || defaultCurrency
  const locale = options?.locale || defaultLocale

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPriceCompact(
  amount: number, 
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  if (amount >= 1000000) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(amount)
  }
  
  return formatPrice(amount, { currency, locale })
}

export function parsePrice(priceString: string): number {
  // Remove currency symbols and parse as float
  const cleaned = priceString.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function formatCurrency(
  amount: number,
  options: Intl.NumberFormatOptions = {}
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }

  return new Intl.NumberFormat('en-US', {
    ...defaultOptions,
    ...options,
  }).format(amount)
}

export function formatNumber(
  number: number,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat('en-US', options).format(number)
}

// Calculate tax amount
export function calculateTax(amount: number, taxRate: number): number {
  return amount * taxRate
}

// Calculate price with tax
export function calculatePriceWithTax(amount: number, taxRate: number): number {
  return amount + calculateTax(amount, taxRate)
}

// Calculate discount amount
export function calculateDiscount(
  amount: number,
  discountType: 'percentage' | 'fixed_amount',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return amount * (discountValue / 100)
  }
  return Math.min(discountValue, amount) // Can't discount more than the amount
}

// Apply discount to amount
export function applyDiscount(
  amount: number,
  discountType: 'percentage' | 'fixed_amount',
  discountValue: number
): number {
  const discountAmount = calculateDiscount(amount, discountType, discountValue)
  return Math.max(0, amount - discountAmount) // Can't go below 0
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

// Convert price to cents (for precise calculations)
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

// Convert cents back to currency
export function fromCents(cents: number): number {
  return cents / 100
}