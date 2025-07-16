'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/contexts/store-context'
import type { 
  KitchenOrder, 
  KitchenOrderWithTransaction, 
  KitchenOrderInsert, 
  KitchenOrderUpdate,
  KitchenOrderStatus 
} from '@/types'

export function useKitchenOrders() {
  const { currentStore } = useStore()
  const [orders, setOrders] = useState<KitchenOrderWithTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch kitchen orders for the current store
  const fetchOrders = async () => {
    if (!currentStore?.id) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('kitchen_orders')
        .select(`
          *,
          transaction:transactions!inner (
            *,
            transaction_items (
              *,
              product:products (*)
            ),
            payments (*),
            customer:customers (*)
          ),
          assigned_staff:profiles!kitchen_orders_assigned_to_fkey (*)
        `)
        .eq('store_id', currentStore.id)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      setOrders(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch kitchen orders')
      console.error('Error fetching kitchen orders:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create a new kitchen order
  const createOrder = async (orderData: KitchenOrderInsert): Promise<KitchenOrder | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('kitchen_orders')
        .insert(orderData)
        .select()
        .single()

      if (createError) throw createError

      // Refresh orders list
      await fetchOrders()

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create kitchen order')
      console.error('Error creating kitchen order:', err)
      return null
    }
  }

  // Update kitchen order status
  const updateOrderStatus = async (
    orderId: string, 
    updates: KitchenOrderUpdate
  ): Promise<boolean> => {
    try {
      // Add timestamps based on status changes
      const timestampUpdates: Partial<KitchenOrderUpdate> = {}
      
      if (updates.status === 'preparing' && !updates.started_at) {
        timestampUpdates.started_at = new Date().toISOString()
      }
      
      if (updates.status === 'ready' && !updates.completed_at) {
        timestampUpdates.completed_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('kitchen_orders')
        .update({ ...updates, ...timestampUpdates })
        .eq('id', orderId)

      if (updateError) throw updateError

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              ...updates, 
              ...timestampUpdates,
              updated_at: new Date().toISOString()
            }
          : order
      ))

      // Also update the related transaction status if needed
      if (updates.status) {
        await updateTransactionStatus(orderId, updates.status)
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update kitchen order')
      console.error('Error updating kitchen order:', err)
      return false
    }
  }

  // Update related transaction status
  const updateTransactionStatus = async (orderId: string, kitchenStatus: KitchenOrderStatus) => {
    try {
      // Find the order to get transaction_id
      const order = orders.find(o => o.id === orderId)
      if (!order) return

      let transactionStatus: string = order.transaction.status

      // Map kitchen status to transaction status
      switch (kitchenStatus) {
        case 'pending':
          transactionStatus = 'kitchen_queue'
          break
        case 'preparing':
          transactionStatus = 'preparing'
          break
        case 'ready':
          transactionStatus = 'ready'
          break
        case 'completed':
          transactionStatus = 'completed'
          break
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          status: transactionStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.transaction_id)

      if (updateError) throw updateError

    } catch (err) {
      console.error('Error updating transaction status:', err)
    }
  }

  // Mark order as completed and picked up
  const completeOrder = async (orderId: string): Promise<boolean> => {
    return await updateOrderStatus(orderId, { 
      status: 'completed' as KitchenOrderStatus,
      completed_at: new Date().toISOString()
    })
  }

  // Assign order to kitchen staff
  const assignOrder = async (orderId: string, staffId: string): Promise<boolean> => {
    return await updateOrderStatus(orderId, { assigned_to: staffId })
  }

  // Get orders by status
  const getOrdersByStatus = (status: KitchenOrderStatus) => {
    return orders.filter(order => order.status === status)
  }

  // Get order statistics
  const getOrderStats = () => {
    const stats = {
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      total: orders.length
    }

    return stats
  }

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentStore?.id) return

    const channel = supabase
      .channel('kitchen_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_orders',
          filter: `store_id=eq.${currentStore.id}`
        },
        () => {
          // Refetch orders when there are changes
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentStore?.id])

  // Initial fetch
  useEffect(() => {
    fetchOrders()
  }, [currentStore?.id])

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrderStatus,
    completeOrder,
    assignOrder,
    getOrdersByStatus,
    getOrderStats,
    refetch: fetchOrders
  }
}