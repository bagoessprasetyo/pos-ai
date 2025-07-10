'use client'

import { useState, useEffect } from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useReceipt } from '@/hooks/use-receipt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Receipt, 
  Eye, 
  RefreshCw,
  Calendar,
  DollarSign,
  CreditCard,
  Package,
  Filter,
  X
} from 'lucide-react'
import { formatPrice } from '@/utils/currency'
import type { TransactionWithItems } from '@/types'

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithItems[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithItems | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const { getTransactionHistory } = useTransactions()
  const { printReceiptForTransaction, loading: receiptLoading } = useReceipt()

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    filterTransactions()
  }, [searchQuery, dateFilter, statusFilter, transactions])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await getTransactionHistory(100, 0)
      setTransactions(data)
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = transactions

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(transaction =>
        transaction.transaction_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.total.toString().includes(searchQuery) ||
        transaction.transaction_items.some(item =>
          item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }

    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.created_at)
        return transactionDate.toDateString() === filterDate.toDateString()
      })
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(transaction => transaction.status === statusFilter)
    }

    setFilteredTransactions(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />
      case 'card':
        return <CreditCard className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-spin" />
          <p>Loading transactions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Transactions</h1>
          <Button onClick={loadTransactions} disabled={loading} size="sm">
            <RefreshCw className="mr-2 h-3 w-3" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-muted/20">
        <div className="p-3 md:p-4">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 md:h-10 text-base md:text-sm"
            />
          </div>

          {/* Date and Status Filters */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 h-11 md:h-10 text-base md:text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Active Filters & Clear */}
          {(searchQuery || dateFilter || statusFilter) && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setDateFilter('')
                  setStatusFilter('')
                }}
                className="h-9"
              >
                <X className="mr-2 h-3 w-3" />
                Clear
              </Button>
              <span className="text-xs md:text-sm text-muted-foreground">
                {filteredTransactions.length} of {transactions.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-auto">
        {filteredTransactions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
              <p className="text-muted-foreground px-4">
                {searchQuery || dateFilter || statusFilter
                  ? 'Try adjusting your search criteria'
                  : 'No transactions have been recorded yet'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 md:p-4 space-y-3">
            {filteredTransactions.map((transaction) => (
              <Card key={transaction.id} className="hover:shadow-sm transition-shadow active:scale-[0.98] md:active:scale-100">
                <CardContent className="p-4">
                  {/* Mobile Layout */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(transaction.payments[0]?.method || 'cash')}
                        <div>
                          <div className="font-semibold text-base">
                            #{transaction.transaction_number}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()} • {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(transaction.status)} variant="outline">
                        {transaction.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-muted-foreground">
                        {transaction.transaction_items.length} {transaction.transaction_items.length === 1 ? 'item' : 'items'}
                      </div>
                      <div className="text-xl font-bold text-primary">
                        {formatPrice(transaction.total)}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTransaction(transaction)
                          setShowDetails(true)
                        }}
                        className="flex-1 h-10"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await printReceiptForTransaction(transaction.id)
                          } catch (error) {
                            console.error('Failed to print receipt:', error)
                          }
                        }}
                        disabled={receiptLoading}
                        className="h-10 px-3"
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(transaction.payments[0]?.method || 'cash')}
                        <div>
                          <div className="font-semibold">
                            #{transaction.transaction_number}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-muted-foreground">Items</div>
                        <div className="font-medium">
                          {transaction.transaction_items.length} items
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-muted-foreground">Total</div>
                        <div className="font-semibold text-lg">
                          {formatPrice(transaction.total)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTransaction(transaction)
                          setShowDetails(true)
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await printReceiptForTransaction(transaction.id)
                          } catch (error) {
                            console.error('Failed to print receipt:', error)
                          }
                        }}
                        disabled={receiptLoading}
                      >
                        <Receipt className="mr-2 h-4 w-4" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 z-50">
          {/* Mobile: Full Screen */}
          <div className="md:hidden absolute inset-0 bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
              <h2 className="text-xl font-bold">Transaction Details</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowDetails(false)
                  setSelectedTransaction(null)
                }}
                className="h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-6">
              {/* Transaction Info */}
              <div className="space-y-4">
                <div className="bg-muted/20 p-4 rounded-lg">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Transaction Number</div>
                      <div className="font-semibold text-lg">#{selectedTransaction.transaction_number}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Date & Time</div>
                      <div className="font-medium">
                        {new Date(selectedTransaction.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(selectedTransaction.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Status</div>
                        <Badge className={getStatusColor(selectedTransaction.status)} variant="outline">
                          {selectedTransaction.status}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Payment</div>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(selectedTransaction.payments[0]?.method || 'cash')}
                          <span className="capitalize">{selectedTransaction.payments[0]?.method || 'cash'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-3 text-lg">Items ({selectedTransaction.transaction_items.length})</h4>
                <div className="space-y-3">
                  {selectedTransaction.transaction_items.map((item, index) => (
                    <div key={index} className="bg-muted/20 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-base leading-tight">{item.product.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.quantity} × {formatPrice(item.unit_price)}
                          </div>
                        </div>
                        <div className="font-bold text-lg text-primary ml-3">
                          {formatPrice(item.line_total)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-muted/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 text-lg">Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-base">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatPrice(selectedTransaction.subtotal)}</span>
                  </div>
                  {selectedTransaction.discount_amount > 0 && (
                    <div className="flex justify-between text-base text-green-600">
                      <span>Discount:</span>
                      <span className="font-medium">-{formatPrice(selectedTransaction.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base">
                    <span>Tax:</span>
                    <span className="font-medium">{formatPrice(selectedTransaction.tax_amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span>{formatPrice(selectedTransaction.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t p-4 space-y-3 bg-background">
              <Button
                onClick={async () => {
                  try {
                    await printReceiptForTransaction(selectedTransaction.id)
                  } catch (error) {
                    console.error('Failed to print receipt:', error)
                  }
                }}
                disabled={receiptLoading}
                className="w-full h-12 text-base"
              >
                <Receipt className="mr-2 h-5 w-5" />
                Print Receipt
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetails(false)
                  setSelectedTransaction(null)
                }}
                className="w-full h-12 text-base"
              >
                Close
              </Button>
            </div>
          </div>

          {/* Desktop: Modal */}
          <div className="hidden md:flex bg-black/50 items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Transaction Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowDetails(false)
                      setSelectedTransaction(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Transaction Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Transaction Number</div>
                    <div className="font-semibold">#{selectedTransaction.transaction_number}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date & Time</div>
                    <div className="font-semibold">
                      {new Date(selectedTransaction.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge className={getStatusColor(selectedTransaction.status)}>
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Payment Method</div>
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(selectedTransaction.payments[0]?.method || 'cash')}
                      {selectedTransaction.payments[0]?.method || 'cash'}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <h4 className="font-semibold mb-3">Items</h4>
                  <div className="space-y-2">
                    {selectedTransaction.transaction_items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.quantity} × {formatPrice(item.unit_price)}
                          </div>
                        </div>
                        <div className="font-semibold">
                          {formatPrice(item.line_total)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPrice(selectedTransaction.subtotal)}</span>
                  </div>
                  {selectedTransaction.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{formatPrice(selectedTransaction.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatPrice(selectedTransaction.tax_amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatPrice(selectedTransaction.total)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={async () => {
                      try {
                        await printReceiptForTransaction(selectedTransaction.id)
                      } catch (error) {
                        console.error('Failed to print receipt:', error)
                      }
                    }}
                    disabled={receiptLoading}
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    Print Receipt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetails(false)
                      setSelectedTransaction(null)
                    }}
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}