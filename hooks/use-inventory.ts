'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import type { Database } from '@/lib/supabase'

// Manual type definitions for inventory tables (not included in generated types)
type Inventory = {
  id: string
  product_id: string
  store_id: string
  quantity: number
  reserved_quantity: number
  reorder_point: number
  reorder_quantity: number
  last_counted_at: string | null
  created_at: string
  updated_at: string
}

type InventoryInsert = {
  id?: string
  product_id: string
  store_id: string
  quantity: number
  reserved_quantity?: number
  reorder_point?: number
  reorder_quantity?: number
  last_counted_at?: string
  created_at?: string
  updated_at?: string
}

type InventoryUpdate = {
  product_id?: string
  store_id?: string
  quantity?: number
  reserved_quantity?: number
  reorder_point?: number
  reorder_quantity?: number
  last_counted_at?: string
  updated_at?: string
}

type InventoryAdjustment = {
  id: string
  inventory_id: string
  adjustment_type: 'manual' | 'sale' | 'return' | 'damage' | 'loss' | 'found'
  quantity_change: number
  reason: string | null
  reference_id: string | null
  adjusted_by: string
  created_at: string
}

export interface InventoryWithProduct extends Inventory {
  product: {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    price: number
    is_active: boolean
  }
}

export interface InventoryFormData {
  quantity: number
  reserved_quantity?: number
  reorder_point?: number
  reorder_quantity?: number
}

export interface InventoryAdjustmentFormData {
  adjustment_type: 'manual' | 'sale' | 'return' | 'damage' | 'loss' | 'found'
  quantity_change: number
  reason?: string
  reference_id?: string
}

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const supabase = createClient()

  const fetchInventory = async () => {
    if (!currentStore) {
      setInventory([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products (
            id,
            name,
            sku,
            barcode,
            price,
            is_active
          )
        `)
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Filter out inventory for inactive products
      const activeInventory = (data || []).filter(inv => inv.product?.is_active)
      setInventory(activeInventory as InventoryWithProduct[])
      setError(null)
    } catch (err) {
      console.error('Error fetching inventory:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory')
    } finally {
      setLoading(false)
    }
  }

  const getInventoryByProduct = async (productId: string): Promise<Inventory | null> => {
    if (!currentStore) return null

    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', productId)
        .eq('store_id', currentStore.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      return data || null
    } catch (err) {
      console.error('Error fetching product inventory:', err)
      return null
    }
  }

  const createInventory = async (productId: string, inventoryData: InventoryFormData) => {
    if (!currentStore) throw new Error('No store selected')

    const { data, error } = await supabase
      .from('inventory')
      .insert({
        product_id: productId,
        store_id: currentStore.id,
        quantity: inventoryData.quantity,
        reserved_quantity: inventoryData.reserved_quantity || 0,
        reorder_point: inventoryData.reorder_point || 0,
        reorder_quantity: inventoryData.reorder_quantity || 0,
      })
      .select()
      .single()

    if (error) throw error
    await fetchInventory() // Refresh the list
    return data
  }

  const updateInventory = async (inventoryId: string, inventoryData: Partial<InventoryFormData>) => {
    const { data, error } = await supabase
      .from('inventory')
      .update({
        ...inventoryData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventoryId)
      .select()
      .single()

    if (error) throw error
    await fetchInventory() // Refresh the list
    return data
  }

  const adjustInventory = async (
    inventoryId: string, 
    adjustmentData: InventoryAdjustmentFormData
  ) => {
    if (!currentStore) throw new Error('No store selected')

    // Get current inventory
    const currentInventory = inventory.find(inv => inv.id === inventoryId)
    if (!currentInventory) throw new Error('Inventory not found')

    // Calculate new quantity
    const newQuantity = currentInventory.quantity + adjustmentData.quantity_change
    if (newQuantity < 0) {
      throw new Error('Insufficient inventory. Cannot adjust below zero.')
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Start transaction-like operations
    try {
      // Create adjustment record
      const { error: adjustmentError } = await supabase
        .from('inventory_adjustments')
        .insert({
          inventory_id: inventoryId,
          adjustment_type: adjustmentData.adjustment_type,
          quantity_change: adjustmentData.quantity_change,
          reason: adjustmentData.reason,
          reference_id: adjustmentData.reference_id,
          adjusted_by: user.id,
        })

      if (adjustmentError) throw adjustmentError

      // Update inventory quantity
      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          quantity: newQuantity,
          last_counted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventoryId)

      if (updateError) throw updateError

      await fetchInventory() // Refresh the list
    } catch (error) {
      console.error('Error adjusting inventory:', error)
      throw error
    }
  }

  const getLowStockItems = () => {
    return inventory.filter(inv => 
      inv.reorder_point > 0 && inv.quantity <= inv.reorder_point
    )
  }

  const getOutOfStockItems = () => {
    return inventory.filter(inv => inv.quantity <= 0)
  }

  const getTotalInventoryValue = () => {
    return inventory.reduce((total, inv) => {
      return total + (inv.quantity * (inv.product?.price || 0))
    }, 0)
  }

  useEffect(() => {
    fetchInventory()
  }, [currentStore])

  return {
    inventory,
    loading,
    error,
    fetchInventory,
    getInventoryByProduct,
    createInventory,
    updateInventory,
    adjustInventory,
    getLowStockItems,
    getOutOfStockItems,
    getTotalInventoryValue,
  }
}

// Hook for inventory adjustments history
export function useInventoryAdjustments(inventoryId?: string) {
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchAdjustments = async () => {
    if (!inventoryId) {
      setAdjustments([])
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory_adjustments')
        .select('*')
        .eq('inventory_id', inventoryId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdjustments(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching adjustments:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch adjustments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdjustments()
  }, [inventoryId])

  return {
    adjustments,
    loading,
    error,
    fetchAdjustments,
  }
}