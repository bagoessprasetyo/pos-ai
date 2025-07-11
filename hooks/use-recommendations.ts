'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/contexts/store-context'
import { useProducts } from './use-products'

export interface ProductRecommendation {
  product_id: string
  product_name: string
  reason: string
  type: 'cross_sell' | 'upsell' | 'bundle' | 'trending'
  confidence_score: number
  potential_value_add: string
  price?: number
  category?: string
}

export interface CartItem {
  id: string
  name: string
  category?: string
  price: number
  quantity: number
}

export interface RecommendationResponse {
  recommendations: ProductRecommendation[]
  generated_at: string
  context_hash: string
}

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCartHash, setLastCartHash] = useState<string>('')
  
  const { currentStore } = useStore()
  const { products } = useProducts()

  // Cache recommendations for 15 minutes
  const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

  // Generate a hash of cart items for caching
  const generateCartHash = useCallback((cartItems: CartItem[]): string => {
    const sortedItems = cartItems
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(item => `${item.id}-${item.quantity}`)
      .join('|')
    return btoa(sortedItems)
  }, [])

  const getRecommendations = useCallback(async (
    cartItems: CartItem[],
    forceRefresh = false
  ): Promise<ProductRecommendation[]> => {
    if (!currentStore?.id || cartItems.length === 0) {
      setRecommendations([])
      return []
    }

    const cartHash = generateCartHash(cartItems)
    
    // Check if cart has changed
    if (!forceRefresh && cartHash === lastCartHash && recommendations.length > 0) {
      return recommendations
    }

    // Check cache
    if (!forceRefresh) {
      try {
        const cacheKey = `recommendations-${currentStore.id}-${cartHash}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const cachedData = JSON.parse(cached)
          const cacheAge = Date.now() - new Date(cachedData.generated_at).getTime()
          
          if (cacheAge < CACHE_DURATION) {
            setRecommendations(cachedData.recommendations)
            setLastCartHash(cartHash)
            return cachedData.recommendations
          }
        }
      } catch (cacheError) {
        console.warn('Failed to load cached recommendations:', cacheError)
      }
    }

    setLoading(true)
    setError(null)

    try {
      // Get recent purchase history for better recommendations
      const recentPurchases = getRecentPurchaseHistory()
      
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: currentStore.id,
          cart_items: cartItems,
          available_products: products.filter(p => p.is_active).slice(0, 100), // Limit for token efficiency
          recent_purchases: recentPurchases,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get recommendations: ${response.statusText}`)
      }

      const data: RecommendationResponse = await response.json()
      
      // Enrich recommendations with product data
      const enrichedRecommendations = data.recommendations.map(rec => {
        const product = products.find(p => p.id === rec.product_id)
        return {
          ...rec,
          price: product?.price,
          category: product?.category?.name,
        }
      }).filter(rec => rec.price !== undefined) // Filter out recommendations for products not found

      setRecommendations(enrichedRecommendations)
      setLastCartHash(cartHash)
      
      // Cache recommendations
      try {
        const cacheKey = `recommendations-${currentStore.id}-${cartHash}`
        localStorage.setItem(cacheKey, JSON.stringify({
          recommendations: enrichedRecommendations,
          generated_at: new Date().toISOString(),
          context_hash: cartHash,
        }))
      } catch (cacheError) {
        console.warn('Failed to cache recommendations:', cacheError)
      }

      return enrichedRecommendations
    } catch (err) {
      console.error('Error getting recommendations:', err)
      setError(err instanceof Error ? err.message : 'Failed to get recommendations')
      return []
    } finally {
      setLoading(false)
    }
  }, [currentStore?.id, products, lastCartHash, recommendations, generateCartHash])

  // Get recent purchase history from localStorage
  const getRecentPurchaseHistory = useCallback(() => {
    try {
      const history = localStorage.getItem('purchase-history')
      if (history) {
        const purchases = JSON.parse(history)
        return purchases.slice(0, 20) // Last 20 unique products
      }
    } catch (error) {
      console.warn('Failed to load purchase history:', error)
    }
    return []
  }, [])

  // Update purchase history
  const updatePurchaseHistory = useCallback((productName: string) => {
    try {
      const history = getRecentPurchaseHistory()
      const existingIndex = history.findIndex((item: any) => item.productName === productName)
      
      if (existingIndex >= 0) {
        history[existingIndex].frequency += 1
        history[existingIndex].lastPurchased = new Date().toISOString()
      } else {
        history.unshift({
          productName,
          frequency: 1,
          lastPurchased: new Date().toISOString(),
        })
      }

      // Keep only last 50 items
      const limitedHistory = history.slice(0, 50)
      localStorage.setItem('purchase-history', JSON.stringify(limitedHistory))
    } catch (error) {
      console.warn('Failed to update purchase history:', error)
    }
  }, [getRecentPurchaseHistory])

  // Clear recommendations when store changes
  useEffect(() => {
    setRecommendations([])
    setLastCartHash('')
    setError(null)
  }, [currentStore?.id])

  // Get recommendations by type
  const getRecommendationsByType = useCallback((type: ProductRecommendation['type']) => {
    return recommendations.filter(rec => rec.type === type)
  }, [recommendations])

  // Get high confidence recommendations
  const getHighConfidenceRecommendations = useCallback((minConfidence = 0.7) => {
    return recommendations.filter(rec => rec.confidence_score >= minConfidence)
  }, [recommendations])

  // Calculate potential cart value increase
  const calculatePotentialIncrease = useCallback(() => {
    return recommendations.reduce((total, rec) => {
      return total + (rec.price || 0)
    }, 0)
  }, [recommendations])

  // Track recommendation interaction
  const trackRecommendationClick = useCallback(async (
    recommendation: ProductRecommendation,
    cartItems: CartItem[]
  ) => {
    try {
      await fetch('/api/ai/recommendations/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: currentStore?.id,
          product_id: recommendation.product_id,
          recommendation_type: recommendation.type,
          cart_context: cartItems,
          action: 'click',
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.warn('Failed to track recommendation click:', error)
    }
  }, [currentStore?.id])

  // Track recommendation purchase
  const trackRecommendationPurchase = useCallback(async (
    recommendation: ProductRecommendation,
    cartItems: CartItem[]
  ) => {
    try {
      await fetch('/api/ai/recommendations/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: currentStore?.id,
          product_id: recommendation.product_id,
          recommendation_type: recommendation.type,
          cart_context: cartItems,
          action: 'purchase',
          timestamp: new Date().toISOString(),
        }),
      })

      // Update purchase history
      updatePurchaseHistory(recommendation.product_name)
    } catch (error) {
      console.warn('Failed to track recommendation purchase:', error)
    }
  }, [currentStore?.id, updatePurchaseHistory])

  return {
    recommendations,
    loading,
    error,
    getRecommendations,
    getRecommendationsByType,
    getHighConfidenceRecommendations,
    calculatePotentialIncrease,
    trackRecommendationClick,
    trackRecommendationPurchase,
    updatePurchaseHistory,
    hasRecommendations: recommendations.length > 0,
  }
}