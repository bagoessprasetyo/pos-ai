'use client'

import { useState, useEffect, useMemo } from 'react'
import { useProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useDiscounts } from '@/hooks/use-discounts'
import { useTransactions } from '@/hooks/use-transactions'
import { useReceipt } from '@/hooks/use-receipt'
import { RecommendationWidget } from '@/components/ai/recommendation-widget'
import { PageErrorBoundary, ComponentErrorBoundary } from '@/components/error-boundary'
import { POSLoading, ProductGridSkeleton } from '@/components/ui/loading'
import { ProductCard } from '@/components/pos/product-card'
import { useDebounce } from '@/lib/performance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Plus, 
  Minus, 
  ShoppingCart, 
  X,
  CreditCard,
  DollarSign,
  Calculator,
  Package,
  CheckCircle,
  Receipt,
  Download,
  Mail
} from 'lucide-react'
import { formatPrice } from '@/utils/currency'
import { toast } from 'sonner'
import type { ProductWithCategory, CartItem, PosTransaction } from '@/types'

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<any>(null)
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<ProductWithCategory[]>([])
  const [recentItems, setRecentItems] = useState<ProductWithCategory[]>([])
  const [showMobileCart, setShowMobileCart] = useState(false)
  
  const { products, loading: productsLoading } = useProducts()
  const { categories } = useCategories()
  const { getActiveDiscounts, calculateDiscountAmount, isDiscountApplicable } = useDiscounts()
  const { processTransaction, loading: transactionLoading, getTodaysSales } = useTransactions()
  const { printReceiptForTransaction, downloadReceiptForTransaction, loading: receiptLoading } = useReceipt()

  // Update search suggestions (using debounced search for performance)
  useEffect(() => {
    if (debouncedSearchQuery.length > 0) {
      const suggestions = products
        .filter(product => 
          product.is_active && (
            product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            product.sku?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
          )
        )
        .slice(0, 5) // Limit to 5 suggestions
      
      setSearchSuggestions(suggestions)
      setShowSearchSuggestions(suggestions.length > 0)
    } else {
      setShowSearchSuggestions(false)
      setSearchSuggestions([])
    }
  }, [debouncedSearchQuery, products])

  // Load recently sold items from localStorage or recent transactions
  useEffect(() => {
    const loadRecentItems = () => {
      try {
        const stored = localStorage.getItem('pos-recent-items')
        if (stored) {
          const recentIds = JSON.parse(stored)
          const recentProducts = products.filter(p => 
            recentIds.includes(p.id) && p.is_active
          ).slice(0, 6) // Limit to 6 recent items
          setRecentItems(recentProducts)
        }
      } catch (error) {
        console.error('Failed to load recent items:', error)
      }
    }
    
    if (products.length > 0) {
      loadRecentItems()
    }
  }, [products])

  // Update recent items when adding to cart
  const addToCartWithRecent = (product: ProductWithCategory) => {
    addToCart(product)
    
    // Update recent items in localStorage
    try {
      const stored = localStorage.getItem('pos-recent-items')
      let recentIds = stored ? JSON.parse(stored) : []
      
      // Remove if already exists, then add to front
      recentIds = recentIds.filter((id: string) => id !== product.id)
      recentIds.unshift(product.id)
      
      // Keep only last 10 items
      recentIds = recentIds.slice(0, 10)
      
      localStorage.setItem('pos-recent-items', JSON.stringify(recentIds))
      
      // Update recent items display
      const updatedRecentProducts = products.filter(p => 
        recentIds.includes(p.id) && p.is_active
      ).slice(0, 6)
      setRecentItems(updatedRecentProducts)
    } catch (error) {
      console.error('Failed to update recent items:', error)
    }
  }

  // Filter products based on search and category (memoized for performance)
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (!product.is_active) return false
      
      const matchesSearch = !debouncedSearchQuery || 
        product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      
      const matchesCategory = !selectedCategory || 
        product.category_id === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [products, debouncedSearchQuery, selectedCategory])

  // Cart operations
  const addToCart = (product: ProductWithCategory) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id)
      
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                line_total: (item.quantity + 1) * item.unit_price
              }
            : item
        )
      } else {
        return [...prevCart, {
          product,
          quantity: 1,
          unit_price: product.price,
          discount_amount: 0,
          line_total: product.price
        }]
      }
    })
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { 
              ...item, 
              quantity: newQuantity,
              line_total: newQuantity * item.unit_price
            }
          : item
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setShowPayment(false)
  }

  // Calculate totals with discount application (memoized for performance)
  const { subtotal, applicableDiscounts, totalDiscountAmount, discountedSubtotal, tax, total, cartItemCount } = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0)
    
    // Apply applicable discounts
    const activeDiscounts = getActiveDiscounts()
    const applicableDiscounts = activeDiscounts.filter(discount => 
      isDiscountApplicable(
        discount, 
        subtotal, 
        cart.map(item => item.product.id),
        cart.map(item => item.product.category_id as string).filter((id): id is string => id !== null)
      )
    )
    
    const totalDiscountAmount = applicableDiscounts.reduce((sum, discount) => 
      sum + calculateDiscountAmount(discount, subtotal, cart), 0
    )
    
    const discountedSubtotal = Math.max(0, subtotal - totalDiscountAmount)
    const tax = discountedSubtotal * 0.08 // 8% tax rate - this would come from store settings
    const total = discountedSubtotal + tax
    
    // Get cart item count for display
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    
    return {
      subtotal,
      applicableDiscounts,
      totalDiscountAmount,
      discountedSubtotal,
      tax,
      total,
      cartItemCount
    }
  }, [cart, getActiveDiscounts, isDiscountApplicable, calculateDiscountAmount])

  if (productsLoading) {
    return <POSLoading />
  }

  return (
    <PageErrorBoundary>
      <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Point of Sale</h1>
          <div className="flex items-center gap-2">
            {/* Desktop Cart Info */}
            <Badge variant="outline" className="hidden md:flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
            </Badge>
            {cart.length > 0 && (
              <Button variant="outline" onClick={clearCart} size="sm" className="hidden md:inline-flex">
                Clear Cart
              </Button>
            )}
            {/* Mobile Cart Button */}
            <Button
              variant="outline"
              onClick={() => setShowMobileCart(true)}
              className="md:hidden relative"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartItemCount > 0 && (
                <Badge className="absolute bg-red-700 -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden md:flex-row min-h-0">
        {/* Product Selection Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Search and Filters */}
          <div className="p-3 md:p-4 border-b">
            <div className="mb-3 md:mb-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchSuggestions.length > 0) {
                      setShowSearchSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow clicking
                    setTimeout(() => setShowSearchSuggestions(false), 200)
                  }}
                  className="pl-9 h-11 md:h-10 text-base md:text-sm"
                />
                
                {/* Search Suggestions */}
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg mt-1 max-h-80 md:max-h-60 overflow-y-auto">
                    {searchSuggestions.map(product => (
                      <div
                        key={product.id}
                        className="p-4 md:p-3 hover:bg-accent active:bg-accent cursor-pointer border-b border-border last:border-b-0 min-h-[60px] md:min-h-auto flex items-center"
                        onClick={() => {
                          addToCartWithRecent(product)
                          setSearchQuery('')
                          setShowSearchSuggestions(false)
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex-1">
                            <div className="font-medium text-base md:text-sm leading-tight">{product.name}</div>
                            <div className="text-sm md:text-xs text-muted-foreground mt-1">
                              {product.sku && `SKU: ${product.sku}`}
                              {product.category && ` • ${product.category.name}`}
                            </div>
                          </div>
                          <div className="text-base md:text-sm font-semibold text-primary ml-3">
                            {formatPrice(product.price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Recently Sold Items - Desktop Only */}
            {recentItems.length > 0 && (
              <div className="mb-4 hidden md:block">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Recently Sold</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {recentItems.map(product => (
                    <Button
                      key={product.id}
                      variant="outline"
                      size="sm"
                      onClick={() => addToCartWithRecent(product)}
                      className="h-10 px-3 whitespace-nowrap flex-shrink-0 flex items-center"
                    >
                      <span className="text-sm font-medium mr-2">
                        {product.name}
                      </span>
                      <span className="text-primary font-semibold text-sm">
                        {formatPrice(product.price)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Category Filter */}
            <div className="flex gap-2 md:gap-2 overflow-x-auto pb-2 touch-pan-x scrollbar-hide" style={{WebkitOverflowScrolling: 'touch'}}>
              <Button
                variant={selectedCategory === '' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('')}
                className="h-11 md:h-10 px-4 md:px-4 whitespace-nowrap flex-shrink-0 text-sm md:text-sm font-medium"
              >
                All Categories
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className="h-11 md:h-10 px-3 md:px-4 whitespace-nowrap flex-shrink-0 text-sm font-medium max-w-[120px] md:max-w-none"
                  title={category.name}
                >
                  <span className="truncate">
                    {category.name.length > 12 ? `${category.name.substring(0, 12)}...` : category.name}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-auto p-3 md:p-4 min-h-0">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory 
                    ? 'Try adjusting your search or category filter' 
                    : 'No products available'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-4 w-full auto-rows-fr">
                {filteredProducts.map(product => {
                  const isInCart = cart.some(item => item.product.id === product.id)
                  const cartItem = cart.find(item => item.product.id === product.id)
                  
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isInCart={isInCart}
                      cartQuantity={cartItem?.quantity}
                      onAddToCart={addToCartWithRecent}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Shopping Cart Sidebar - Desktop Only */}
        <div className="hidden md:flex w-80 border-l flex-col bg-muted/20">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart
            </h2>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Cart is empty</p>
                <p className="text-sm text-muted-foreground">Add products to start a sale</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <Card key={item.product.id} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-xs line-clamp-2">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(item.unit_price)} each
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.product.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="h-8 w-8"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-12 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="h-8 w-8"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="font-semibold">
                        {formatPrice(item.line_total)}
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* AI Recommendation Widget */}
                <div className="mt-4">
                  <RecommendationWidget
                    cartItems={cart.map(item => ({
                      id: item.product.id,
                      name: item.product.name,
                      category: (item.product as any).category?.name,
                      price: item.unit_price,
                      quantity: item.quantity
                    }))}
                    onAddToCart={(productId, productName) => {
                      // Find the product in our products list and add it
                      const product = products.find(p => p.id === productId)
                      if (product) {
                        addToCartWithRecent(product)
                      }
                    }}
                    compact={true}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart Totals and Checkout */}
          {cart.length > 0 && (
            <div className="border-t p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {totalDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-{formatPrice(totalDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Tax (8%):</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total:</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setShowPayment(true)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Proceed to Payment
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={clearCart}
                >
                  Clear Cart
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Process Payment</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowPayment(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Order Summary */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Items:</span>
                    <span>{cartItemCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {totalDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>-{formatPrice(totalDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                
                {/* Payment Methods */}
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={async () => {
                      try {
                        const transactionData = {
                          items: cart,
                          subtotal,
                          tax_amount: tax,
                          discount_amount: totalDiscountAmount,
                          total,
                          payments: [{
                            method: 'cash',
                            amount: total
                          }],
                          notes: applicableDiscounts.length > 0 
                            ? `Applied discounts: ${applicableDiscounts.map(d => d.name).join(', ')}`
                            : undefined
                        };
                        
                        const result = await processTransaction(transactionData)
                        setLastTransaction(result)
                        clearCart()
                        setShowSuccess(true)
                        toast.success('Payment processed successfully!')
                        
                      } catch (err) {
                        console.error('Payment failed:', err)
                        toast.error('Payment failed. Please try again.')
                      }
                    }}
                    disabled={transactionLoading}
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    {transactionLoading ? 'Processing...' : 'Cash Payment'}
                  </Button>
                  <Button variant="outline" className="w-full" size="lg" disabled>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Card Payment (Coming Soon)
                  </Button>
                </div>
                
                {/* Applied Discounts Info */}
                {applicableDiscounts.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm font-medium text-green-800 mb-2">
                      Applied Discounts:
                    </div>
                    {applicableDiscounts.map(discount => (
                      <div key={discount.id} className="text-xs text-green-700">
                        • {discount.name} (-{formatPrice(calculateDiscountAmount(discount, subtotal, cart))})
                      </div>
                    ))}
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowPayment(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && lastTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <CardTitle className="text-green-600">Payment Successful!</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Transaction #{lastTransaction.transaction_number}
                  </div>
                  <div className="text-2xl font-bold">
                    {formatPrice(lastTransaction.total)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(lastTransaction.created_at).toLocaleString()}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={async () => {
                      try {
                        await printReceiptForTransaction(lastTransaction.id)
                      } catch (err) {
                        console.error('Failed to print receipt:', err)
                        toast.error('Failed to print receipt')
                      }
                    }}
                    disabled={receiptLoading}
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    Print Receipt
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        try {
                          await downloadReceiptForTransaction(lastTransaction.id)
                        } catch (err) {
                          console.error('Failed to download receipt:', err)
                          toast.error('Failed to download receipt')
                        }
                      }}
                      disabled={receiptLoading}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // TODO: Show email modal
                        const email = prompt('Enter customer email:')
                        if (email) {
                          console.log('Email receipt to:', email)
                        }
                      }}
                      disabled={receiptLoading}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setShowSuccess(false)
                      setLastTransaction(null)
                    }}
                  >
                    Continue Selling
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Cart Button - Mobile Only */}
      {!showMobileCart && cart.length > 0 && (
        <Button
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg md:hidden z-40"
          onClick={() => setShowMobileCart(true)}
        >
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            <Badge className="absolute -top-3 bg-red-700 -right-3 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
              {cartItemCount}
            </Badge>
          </div>
        </Button>
      )}

      {/* Mobile Cart Drawer */}
      {showMobileCart && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background flex flex-col">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                Cart ({cartItemCount})
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileCart(false)}
                className="h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Cart is empty</p>
                  <p className="text-sm text-muted-foreground">Add products to start a sale</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <Card key={item.product.id} className="p-4 bg-muted/20">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">{item.product.name}</h4>
                          <p className="text-muted-foreground">
                            {formatPrice(item.unit_price)} each
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.product.id)}
                          className="h-10 w-10 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="h-12 w-12"
                          >
                            <Minus className="h-5 w-5" />
                          </Button>
                          <span className="w-16 text-center font-bold text-lg">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="h-12 w-12"
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </div>
                        <div className="font-bold text-lg text-primary">
                          {formatPrice(item.line_total)}
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {/* AI Recommendation Widget */}
                  <div className="mt-4">
                    <ComponentErrorBoundary componentName="Recommendation Widget">
                      <RecommendationWidget
                        cartItems={cart.map(item => ({
                          id: item.product.id,
                          name: item.product.name,
                          category: (item.product as any).category?.name,
                          price: item.unit_price,
                          quantity: item.quantity
                        }))}
                        onAddToCart={(productId, productName) => {
                          // Find the product in our products list and add it
                          const product = products.find(p => p.id === productId)
                          if (product) {
                            addToCartWithRecent(product)
                          }
                        }}
                        compact={true}
                      />
                    </ComponentErrorBoundary>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Actions */}
            {cart.length > 0 && (
              <div className="border-t p-4 space-y-4 bg-background">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {totalDiscountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{formatPrice(totalDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax (8%):</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                <div className="space-y-3 pb-8">
                  <Button 
                    className="w-full h-12 text-lg" 
                    onClick={() => {
                      setShowMobileCart(false)
                      setShowPayment(true)
                    }}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Proceed to Payment
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={clearCart}
                      className="h-10"
                    >
                      Clear Cart
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowMobileCart(false)}
                      className="h-10"
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </PageErrorBoundary>
  )
}