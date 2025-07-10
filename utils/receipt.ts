import type { 
  Transaction, 
  TransactionWithItems, 
  Store, 
  CartItem 
} from '@/types'
import { formatPrice } from './currency'

export interface ReceiptData {
  store: {
    name: string
    address?: string
    phone?: string
    email?: string
  }
  transaction: {
    number: string
    date: string
    cashier: string
    total: number
    subtotal: number
    tax: number
    discount: number
  }
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
  payment: {
    method: string
    amount: number
    change?: number
  }
}

export function generateReceiptData(
  transaction: TransactionWithItems,
  store: Store,
  cashierName?: string
): ReceiptData {
  return {
    store: {
      name: store.name,
      address: store.address || undefined,
      phone: store.phone || undefined,
      email: store.email || undefined,
    },
    transaction: {
      number: transaction.transaction_number,
      date: new Date(transaction.created_at).toLocaleString(),
      cashier: cashierName || 'Unknown',
      total: transaction.total,
      subtotal: transaction.subtotal,
      tax: transaction.tax_amount,
      discount: transaction.discount_amount,
    },
    items: transaction.transaction_items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.unit_price,
      total: item.line_total,
    })),
    payment: {
      method: transaction.payments[0]?.method || 'cash',
      amount: transaction.payments[0]?.amount || transaction.total,
      change: transaction.change_due || undefined,
    },
  }
}

export function generateReceiptText(receiptData: ReceiptData): string {
  const { store, transaction, items, payment } = receiptData
  
  let receipt = ''
  
  // Store Header
  receipt += `${store.name}\n`
  if (store.address) receipt += `${store.address}\n`
  if (store.phone) receipt += `Tel: ${store.phone}\n`
  if (store.email) receipt += `Email: ${store.email}\n`
  receipt += '\n'
  
  // Transaction Info
  receipt += `Transaction #: ${transaction.number}\n`
  receipt += `Date: ${transaction.date}\n`
  receipt += `Cashier: ${transaction.cashier}\n`
  receipt += '=====================================\n'
  
  // Items
  receipt += 'ITEM                QTY    PRICE   TOTAL\n'
  receipt += '-------------------------------------\n'
  
  items.forEach(item => {
    const itemName = item.name.length > 15 ? item.name.substring(0, 15) : item.name
    const line = `${itemName.padEnd(15)} ${item.quantity.toString().padStart(3)} ${formatPrice(item.price).padStart(8)} ${formatPrice(item.total).padStart(8)}\n`
    receipt += line
  })
  
  receipt += '=====================================\n'
  
  // Totals
  receipt += `Subtotal:              ${formatPrice(transaction.subtotal).padStart(12)}\n`
  
  if (transaction.discount > 0) {
    receipt += `Discount:              ${formatPrice(-transaction.discount).padStart(12)}\n`
  }
  
  receipt += `Tax:                   ${formatPrice(transaction.tax).padStart(12)}\n`
  receipt += `TOTAL:                 ${formatPrice(transaction.total).padStart(12)}\n`
  receipt += '\n'
  
  // Payment
  receipt += `Payment Method: ${payment.method.toUpperCase()}\n`
  receipt += `Amount Paid:           ${formatPrice(payment.amount).padStart(12)}\n`
  
  if (payment.change && payment.change > 0) {
    receipt += `Change:                ${formatPrice(payment.change).padStart(12)}\n`
  }
  
  receipt += '\n'
  receipt += 'Thank you for your business!\n'
  receipt += '=====================================\n'
  
  return receipt
}

export function generateReceiptHTML(receiptData: ReceiptData): string {
  const { store, transaction, items, payment } = receiptData
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - ${transaction.number}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          max-width: 300px;
          margin: 0 auto;
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-bottom: 1px dashed #000; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; }
        .item-row { 
          display: grid; 
          grid-template-columns: 2fr 1fr 1fr 1fr; 
          gap: 5px;
          margin: 2px 0;
        }
        .total-row { 
          display: flex; 
          justify-content: space-between; 
          font-weight: bold;
          font-size: 14px;
        }
        @media print {
          body { margin: 0; padding: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="center bold">
        <div style="font-size: 16px;">${store.name}</div>
        ${store.address ? `<div>${store.address}</div>` : ''}
        ${store.phone ? `<div>Tel: ${store.phone}</div>` : ''}
        ${store.email ? `<div>Email: ${store.email}</div>` : ''}
      </div>
      
      <div class="line"></div>
      
      <div class="row">
        <span>Receipt #:</span>
        <span>${transaction.number}</span>
      </div>
      <div class="row">
        <span>Date:</span>
        <span>${transaction.date}</span>
      </div>
      <div class="row">
        <span>Cashier:</span>
        <span>${transaction.cashier}</span>
      </div>
      
      <div class="line"></div>
      
      <div class="bold item-row">
        <span>ITEM</span>
        <span>QTY</span>
        <span>PRICE</span>
        <span>TOTAL</span>
      </div>
      
      ${items.map(item => `
        <div class="item-row">
          <span style="overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
          <span>${item.quantity}</span>
          <span>${formatPrice(item.price)}</span>
          <span>${formatPrice(item.total)}</span>
        </div>
      `).join('')}
      
      <div class="line"></div>
      
      <div class="row">
        <span>Subtotal:</span>
        <span>${formatPrice(transaction.subtotal)}</span>
      </div>
      
      ${transaction.discount > 0 ? `
        <div class="row">
          <span>Discount:</span>
          <span>-${formatPrice(transaction.discount)}</span>
        </div>
      ` : ''}
      
      <div class="row">
        <span>Tax:</span>
        <span>${formatPrice(transaction.tax)}</span>
      </div>
      
      <div class="total-row">
        <span>TOTAL:</span>
        <span>${formatPrice(transaction.total)}</span>
      </div>
      
      <div class="line"></div>
      
      <div class="row">
        <span>Payment:</span>
        <span>${payment.method.toUpperCase()}</span>
      </div>
      <div class="row">
        <span>Amount Paid:</span>
        <span>${formatPrice(payment.amount)}</span>
      </div>
      
      ${payment.change && payment.change > 0 ? `
        <div class="row">
          <span>Change:</span>
          <span>${formatPrice(payment.change)}</span>
        </div>
      ` : ''}
      
      <div class="center" style="margin-top: 20px;">
        <div class="bold">Thank you for your business!</div>
      </div>
    </body>
    </html>
  `
}

// Print receipt function for browser
export function printReceipt(receiptData: ReceiptData) {
  const htmlContent = generateReceiptHTML(receiptData)
  const printWindow = window.open('', '_blank')
  
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }
}

// Download receipt as text file
export function downloadReceiptText(receiptData: ReceiptData) {
  const textContent = generateReceiptText(receiptData)
  const blob = new Blob([textContent], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `receipt-${receiptData.transaction.number}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}