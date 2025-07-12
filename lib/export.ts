import { formatPrice } from '@/utils/currency'

export interface ExportColumn<T = any> {
  key: keyof T | string
  label: string
  transform?: (value: any, row: T) => string | number
  width?: number
}

export interface ExportOptions {
  filename: string
  format: 'csv' | 'xlsx' | 'json' | 'pdf'
  includeHeaders?: boolean
  dateRange?: {
    start: string
    end: string
  }
  filters?: Record<string, any>
}

// CSV Export functionality
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: Omit<ExportOptions, 'format'>
): void {
  if (!data.length) {
    throw new Error('No data to export')
  }

  const headers = columns.map(col => col.label)
  const rows = data.map(row => 
    columns.map(col => {
      const value = getNestedValue(row, col.key as string)
      return col.transform ? col.transform(value, row) : value
    })
  )

  let csvContent = ''
  
  if (options.includeHeaders !== false) {
    csvContent += headers.join(',') + '\n'
  }
  
  rows.forEach(row => {
    const escapedRow = row.map(cell => {
      const cellStr = String(cell || '')
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    })
    csvContent += escapedRow.join(',') + '\n'
  })

  downloadFile(csvContent, `${options.filename}.csv`, 'text/csv')
}

// JSON Export functionality
export function exportToJSON<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: Omit<ExportOptions, 'format'>
): void {
  if (!data.length) {
    throw new Error('No data to export')
  }

  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalRecords: data.length,
      filters: options.filters || {},
      dateRange: options.dateRange
    },
    data: data.map(row => {
      const exportRow: Record<string, any> = {}
      columns.forEach(col => {
        const value = getNestedValue(row, col.key as string)
        exportRow[col.key as string] = col.transform ? col.transform(value, row) : value
      })
      return exportRow
    })
  }

  const jsonContent = JSON.stringify(exportData, null, 2)
  downloadFile(jsonContent, `${options.filename}.json`, 'application/json')
}

// XLSX Export functionality (requires SheetJS in a real implementation)
export function exportToXLSX<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: Omit<ExportOptions, 'format'>
): void {
  // This is a placeholder implementation
  // In a real app, you'd use a library like xlsx or exceljs
  console.warn('XLSX export requires additional library. Falling back to CSV.')
  exportToCSV(data, columns, options)
}

// PDF Export functionality (requires jsPDF in a real implementation)
export function exportToPDF<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: Omit<ExportOptions, 'format'>
): void {
  // This is a placeholder implementation
  // In a real app, you'd use a library like jsPDF or PDFKit
  console.warn('PDF export requires additional library. Falling back to CSV.')
  exportToCSV(data, columns, options)
}

// Main export function
export function exportData<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  try {
    switch (options.format) {
      case 'csv':
        exportToCSV(data, columns, options)
        break
      case 'json':
        exportToJSON(data, columns, options)
        break
      case 'xlsx':
        exportToXLSX(data, columns, options)
        break
      case 'pdf':
        exportToPDF(data, columns, options)
        break
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  } catch (error) {
    console.error('Export failed:', error)
    throw error
  }
}

// Utility functions
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

// Pre-configured export columns for common entities
export const exportColumns = {
  products: [
    { key: 'name', label: 'Product Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'category.name', label: 'Category' },
    { 
      key: 'price', 
      label: 'Price',
      transform: (value: number) => formatPrice(value)
    },
    { 
      key: 'cost', 
      label: 'Cost',
      transform: (value: number) => value ? formatPrice(value) : ''
    },
    { key: 'weight', label: 'Weight' },
    { 
      key: 'is_active', 
      label: 'Status',
      transform: (value: boolean) => value ? 'Active' : 'Inactive'
    },
    { 
      key: 'is_featured', 
      label: 'Featured',
      transform: (value: boolean) => value ? 'Yes' : 'No'
    },
    { 
      key: 'created_at', 
      label: 'Created Date',
      transform: (value: string) => new Date(value).toLocaleDateString()
    }
  ] as ExportColumn[],

  transactions: [
    { key: 'transaction_number', label: 'Transaction #' },
    { 
      key: 'created_at', 
      label: 'Date',
      transform: (value: string) => new Date(value).toLocaleString()
    },
    { key: 'customer.first_name', label: 'Customer' },
    { 
      key: 'subtotal', 
      label: 'Subtotal',
      transform: (value: number) => formatPrice(value)
    },
    { 
      key: 'tax_amount', 
      label: 'Tax',
      transform: (value: number) => formatPrice(value)
    },
    { 
      key: 'discount_amount', 
      label: 'Discount',
      transform: (value: number) => formatPrice(value)
    },
    { 
      key: 'total', 
      label: 'Total',
      transform: (value: number) => formatPrice(value)
    },
    { key: 'status', label: 'Status' },
    { 
      key: 'payments', 
      label: 'Payment Methods',
      transform: (value: any[]) => value?.map(p => p.method).join(', ') || ''
    }
  ] as ExportColumn[],

  customers: [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address.city', label: 'City' },
    { key: 'address.state', label: 'State' },
    { 
      key: 'total_spent', 
      label: 'Total Spent',
      transform: (value: number) => formatPrice(value)
    },
    { key: 'visit_count', label: 'Visit Count' },
    { key: 'loyalty_points', label: 'Loyalty Points' },
    { 
      key: 'created_at', 
      label: 'Created Date',
      transform: (value: string) => new Date(value).toLocaleDateString()
    }
  ] as ExportColumn[],

  inventory: [
    { key: 'product.name', label: 'Product Name' },
    { key: 'product.sku', label: 'SKU' },
    { key: 'quantity_on_hand', label: 'On Hand' },
    { key: 'quantity_reserved', label: 'Reserved' },
    { key: 'quantity_available', label: 'Available' },
    { key: 'reorder_point', label: 'Reorder Point' },
    { key: 'max_stock_level', label: 'Max Stock' },
    { 
      key: 'cost_per_unit', 
      label: 'Cost per Unit',
      transform: (value: number) => value ? formatPrice(value) : ''
    },
    { 
      key: 'last_counted_at', 
      label: 'Last Counted',
      transform: (value: string) => value ? new Date(value).toLocaleDateString() : 'Never'
    }
  ] as ExportColumn[],

  sales: [
    { key: 'date', label: 'Date' },
    { 
      key: 'sales', 
      label: 'Sales',
      transform: (value: number) => formatPrice(value)
    },
    { key: 'transactions', label: 'Transactions' },
    { key: 'customers', label: 'Customers' },
    { key: 'items_sold', label: 'Items Sold' },
    { 
      key: 'average_transaction', 
      label: 'Avg Transaction',
      transform: (value: number, row: any) => 
        row.transactions > 0 ? formatPrice(row.sales / row.transactions) : formatPrice(0)
    }
  ] as ExportColumn[]
}

// Export analytics data
export function exportAnalytics(
  type: 'sales' | 'products' | 'customers',
  data: any[],
  options: Partial<ExportOptions> = {}
): void {
  const defaultOptions: ExportOptions = {
    filename: `${type}_report_${new Date().toISOString().split('T')[0]}`,
    format: 'csv',
    includeHeaders: true,
    ...options
  }

  let columns: ExportColumn[]
  
  switch (type) {
    case 'sales':
      columns = exportColumns.sales
      break
    case 'products':
      columns = exportColumns.products
      break
    case 'customers':
      columns = exportColumns.customers
      break
    default:
      throw new Error(`Unknown analytics type: ${type}`)
  }

  exportData(data, columns, defaultOptions)
}

// Receipt export functionality
export function exportReceipt(transaction: any): void {
  const receiptContent = generateReceiptContent(transaction)
  downloadFile(receiptContent, `receipt_${transaction.transaction_number}.txt`, 'text/plain')
}

function generateReceiptContent(transaction: any): string {
  const lines: string[] = []
  
  lines.push('========================================')
  lines.push('           RECEIPT')
  lines.push('========================================')
  lines.push('')
  lines.push(`Transaction #: ${transaction.transaction_number}`)
  lines.push(`Date: ${new Date(transaction.created_at).toLocaleString()}`)
  
  if (transaction.customer) {
    lines.push(`Customer: ${transaction.customer.first_name} ${transaction.customer.last_name}`)
  }
  
  lines.push('')
  lines.push('ITEMS:')
  lines.push('----------------------------------------')
  
  transaction.items?.forEach((item: any) => {
    const itemLine = `${item.product.name}`
    const qtyLine = `  ${item.quantity} x ${formatPrice(item.unit_price)} = ${formatPrice(item.line_total)}`
    lines.push(itemLine)
    lines.push(qtyLine)
    
    if (item.discount_amount > 0) {
      lines.push(`  Discount: -${formatPrice(item.discount_amount)}`)
    }
  })
  
  lines.push('----------------------------------------')
  lines.push(`Subtotal: ${formatPrice(transaction.subtotal)}`)
  
  if (transaction.discount_amount > 0) {
    lines.push(`Discount: -${formatPrice(transaction.discount_amount)}`)
  }
  
  if (transaction.tax_amount > 0) {
    lines.push(`Tax: ${formatPrice(transaction.tax_amount)}`)
  }
  
  lines.push(`TOTAL: ${formatPrice(transaction.total)}`)
  lines.push('')
  lines.push('PAYMENTS:')
  
  transaction.payments?.forEach((payment: any) => {
    lines.push(`${payment.method.toUpperCase()}: ${formatPrice(payment.amount)}`)
  })
  
  lines.push('')
  lines.push('Thank you for your business!')
  lines.push('========================================')
  
  return lines.join('\n')
}