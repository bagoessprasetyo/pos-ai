'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import type { Product, ProductWithCategory, ProductFormData } from '@/types'

export function useProducts() {
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const supabase = createClient()

  const fetchProducts = async () => {
    if (!currentStore) {
      setProducts([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
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
      setProducts(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const createProduct = async (productData: ProductFormData) => {
    if (!currentStore) throw new Error('No store selected')

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...productData,
        store_id: currentStore.id,
      })
      .select()
      .single()

    if (error) throw error
    await fetchProducts() // Refresh the list
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
    await fetchProducts() // Refresh the list
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
    await fetchProducts() // Refresh the list
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