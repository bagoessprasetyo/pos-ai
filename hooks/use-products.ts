'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import { errorHandler, withRetry } from '@/lib/error-handler'
import { cache, generateCacheKey } from '@/lib/cache'
import { useDebouncedCallback } from '@/lib/performance'
import type { Product, ProductWithCategory, ProductFormData } from '@/types'

export function useProducts() {
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const supabase = createClient()

  const fetchProducts = useCallback(async () => {
    if (!currentStore) {
      setProducts([])
      setLoading(false)
      return
    }

    const cacheKey = generateCacheKey('products', currentStore.id)

    try {
      setLoading(true)
      
      // Try cache first
      const cachedProducts = await cache.get<ProductWithCategory[]>(cacheKey, {
        ttl: 5 * 60 * 1000, // 5 minutes cache
        storage: 'localStorage'
      })

      if (cachedProducts) {
        setProducts(cachedProducts)
        setLoading(false)
        setError(null)
        return
      }

      console.log('Fetching products for store:', currentStore.id)
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      
      console.log('Fetched products:', data?.length || 0, 'products')
      const products = data || []
      setProducts(products)
      setError(null)

      // Cache the result
      await cache.set(cacheKey, products, {
        ttl: 5 * 60 * 1000, // 5 minutes cache
        storage: 'localStorage'
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch products')
      errorHandler.logError(error, {
        storeId: currentStore?.id,
        action: 'fetch_products',
        component: 'use-products'
      })
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [currentStore, supabase])

  const createProduct = async (productData: ProductFormData) => {
    if (!currentStore) throw new Error('No store selected')

    console.log('Creating product:', productData)
    
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...productData,
        store_id: currentStore.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Product creation error:', error)
      throw error
    }
    
    console.log('Product created successfully:', data)
    
    // Invalidate cache and refresh
    const cacheKey = generateCacheKey('products', currentStore.id)
    await cache.delete(cacheKey)
    await fetchProducts()
    
    return data
  }

  const updateProduct = async (id: string, productData: Partial<ProductFormData>) => {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...productData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    
    // Invalidate cache and refresh
    const cacheKey = generateCacheKey('products', currentStore!.id)
    await cache.delete(cacheKey)
    await fetchProducts()
    
    return data
  }

  const deleteProduct = async (id: string) => {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('products')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
    
    // Invalidate cache and refresh
    const cacheKey = generateCacheKey('products', currentStore!.id)
    await cache.delete(cacheKey)
    await fetchProducts()
  }

  const searchProducts = async (query: string) => {
    if (!currentStore) return []

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('store_id', currentStore.id)
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.eq.${query}`)
      .order('name')

    if (error) throw error
    return data || []
  }

  useEffect(() => {
    fetchProducts()
  }, [currentStore])

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
  }
}