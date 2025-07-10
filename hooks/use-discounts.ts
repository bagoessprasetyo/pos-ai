'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import type { Discount, DiscountFormData } from '@/types'

export function useDiscounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const supabase = createClient()

  const fetchDiscounts = async () => {
    if (!currentStore) {
      setDiscounts([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDiscounts(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching discounts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch discounts')
    } finally {
      setLoading(false)
    }
  }

  const createDiscount = async (discountData: DiscountFormData) => {
    if (!currentStore) throw new Error('No store selected')

    const { data, error } = await supabase
      .from('discounts')
      .insert({
        ...discountData,
        store_id: currentStore.id,
        start_date: discountData.start_date ? new Date(discountData.start_date).toISOString() : null,
        end_date: discountData.end_date ? new Date(discountData.end_date).toISOString() : null,
        applicable_ids: discountData.applicable_ids || [],
        conditions: discountData.conditions || {},
      })
      .select()
      .single()

    if (error) throw error
    await fetchDiscounts() // Refresh the list
    return data
  }

  const updateDiscount = async (id: string, discountData: Partial<DiscountFormData>) => {
    const updateData: any = {
      ...discountData,
      updated_at: new Date().toISOString(),
    }

    // Handle date conversions
    if (discountData.start_date !== undefined) {
      updateData.start_date = discountData.start_date ? new Date(discountData.start_date).toISOString() : null
    }
    if (discountData.end_date !== undefined) {
      updateData.end_date = discountData.end_date ? new Date(discountData.end_date).toISOString() : null
    }

    const { data, error } = await supabase
      .from('discounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    await fetchDiscounts() // Refresh the list
    return data
  }

  const deleteDiscount = async (id: string) => {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('discounts')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
    await fetchDiscounts() // Refresh the list
  }

  const getActiveDiscounts = () => {
    const now = new Date()
    return discounts.filter(discount => {
      if (!discount.is_active) return false
      
      // Check date range
      if (discount.start_date && new Date(discount.start_date) > now) return false
      if (discount.end_date && new Date(discount.end_date) < now) return false
      
      // Check usage limit
      if (discount.usage_limit && discount.usage_count >= discount.usage_limit) return false
      
      return true
    })
  }

  const getDiscountByCode = (code: string) => {
    const activeDiscounts = getActiveDiscounts()
    return activeDiscounts.find(discount => discount.code === code)
  }

  const calculateDiscountAmount = (discount: Discount, subtotal: number, items?: any[]) => {
    switch (discount.type) {
      case 'percentage':
        let amount = subtotal * (discount.value / 100)
        
        // Check maximum discount limit
        const conditions = discount.conditions as any
        if (conditions?.maximum_discount && amount > conditions.maximum_discount) {
          amount = conditions.maximum_discount
        }
        
        return Math.round(amount * 100) / 100

      case 'fixed_amount':
        return Math.min(discount.value, subtotal)

      case 'buy_x_get_y':
        // This would need more complex logic based on items
        // For now, return 0 - this would be implemented in POS logic
        return 0

      default:
        return 0
    }
  }

  const isDiscountApplicable = (discount: Discount, subtotal: number, productIds?: string[], categoryIds?: string[]) => {
    // Check minimum purchase
    const conditions = discount.conditions as any
    if (conditions?.minimum_purchase && subtotal < conditions.minimum_purchase) {
      return false
    }

    // Check applicable products/categories
    if (discount.applicable_to === 'products' && productIds) {
      return discount.applicable_ids.some((id: string) => productIds.includes(id))
    }
    
    if (discount.applicable_to === 'categories' && categoryIds) {
      return discount.applicable_ids.some((id: string) => categoryIds.includes(id))
    }

    // 'all' is always applicable if other conditions are met
    return discount.applicable_to === 'all'
  }

  useEffect(() => {
    fetchDiscounts()
  }, [currentStore])

  return {
    discounts,
    loading,
    error,
    fetchDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    getActiveDiscounts,
    getDiscountByCode,
    calculateDiscountAmount,
    isDiscountApplicable,
  }
}