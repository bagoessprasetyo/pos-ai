'use client'

import { useState, useCallback, useMemo } from 'react'
import { cache, generateCacheKey } from '@/lib/cache'
import type { CartItem, ProductWithCategory } from '@/types'

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([])

  // Memoized cart calculations
  const cartMetrics = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0)
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const uniqueItems = cart.length

    return {
      subtotal,
      itemCount,
      uniqueItems,
      isEmpty: cart.length === 0
    }
  }, [cart])

  // Add item to cart (memoized to prevent unnecessary re-renders)
  const addToCart = useCallback((product: ProductWithCategory) => {
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
  }, [])

  // Update quantity (memoized)
  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
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
  }, [])

  // Remove item from cart (memoized)
  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId))
  }, [])

  // Clear cart (memoized)
  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  // Get item by product ID (memoized)
  const getCartItem = useCallback((productId: string) => {
    return cart.find(item => item.product.id === productId)
  }, [cart])

  // Check if product is in cart (memoized)
  const isInCart = useCallback((productId: string) => {
    return cart.some(item => item.product.id === productId)
  }, [cart])

  // Save cart to cache for persistence
  const saveCartToCache = useCallback(async (storeId?: string) => {
    if (storeId) {
      const cacheKey = generateCacheKey('cart', storeId)
      await cache.set(cacheKey, cart, {
        ttl: 60 * 60 * 1000, // 1 hour
        storage: 'localStorage'
      })
    }
  }, [cart])

  // Load cart from cache
  const loadCartFromCache = useCallback(async (storeId?: string) => {
    if (storeId) {
      const cacheKey = generateCacheKey('cart', storeId)
      const cachedCart = await cache.get<CartItem[]>(cacheKey, {
        storage: 'localStorage'
      })
      
      if (cachedCart) {
        setCart(cachedCart)
      }
    }
  }, [])

  // Batch update cart items (for performance when making multiple changes)
  const batchUpdateCart = useCallback((updates: Array<{
    productId: string
    quantity: number
  }>) => {
    setCart(prevCart => {
      let newCart = [...prevCart]
      
      updates.forEach(({ productId, quantity }) => {
        if (quantity <= 0) {
          newCart = newCart.filter(item => item.product.id !== productId)
        } else {
          const index = newCart.findIndex(item => item.product.id === productId)
          if (index >= 0) {
            newCart[index] = {
              ...newCart[index],
              quantity,
              line_total: quantity * newCart[index].unit_price
            }
          }
        }
      })
      
      return newCart
    })
  }, [])

  // Apply discount to specific item
  const applyItemDiscount = useCallback((productId: string, discountAmount: number) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? {
              ...item,
              discount_amount: discountAmount,
              line_total: Math.max(0, (item.quantity * item.unit_price) - discountAmount)
            }
          : item
      )
    )
  }, [])

  // Get cart summary for analytics
  const getCartSummary = useCallback(() => {
    const categories = new Set<string>()
    const brands = new Set<string>()
    let totalValue = 0
    
    cart.forEach(item => {
      // Note: product.category is not available in base Product type
      // This would need to be fetched separately if needed
      totalValue += item.line_total
    })

    return {
      totalItems: cartMetrics.itemCount,
      uniqueItems: cartMetrics.uniqueItems,
      totalValue,
      categories: Array.from(categories),
      averageItemValue: cartMetrics.uniqueItems > 0 ? totalValue / cartMetrics.uniqueItems : 0
    }
  }, [cart, cartMetrics])

  return {
    // State
    cart,
    
    // Metrics
    ...cartMetrics,
    
    // Actions
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    batchUpdateCart,
    applyItemDiscount,
    
    // Queries
    getCartItem,
    isInCart,
    getCartSummary,
    
    // Persistence
    saveCartToCache,
    loadCartFromCache
  }
}