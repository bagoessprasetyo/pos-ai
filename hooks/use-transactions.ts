'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import { useStoreSettings } from '@/hooks/use-store-settings'
import type { 
  PosTransaction, 
  CartItem, 
  Transaction, 
  TransactionInsert,
  TransactionWithItems,
  KitchenOrderInsert,
  KitchenOrderPriority,
  KitchenOrderStatus
} from '@/types'

export function useTransactions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const { kitchen_dashboard_enabled } = useStoreSettings()
  const supabase = createClient()

  const processTransaction = async (transactionData: PosTransaction) => {
    if (!currentStore) throw new Error('No store selected')
    
    // Process transaction for the current store
    
    setLoading(true)
    setError(null)

    try {
      // Start transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          store_id: currentStore.id,
          customer_id: transactionData.customer_id || null,
          cashier_id: (await supabase.auth.getUser()).data.user?.id!,
          transaction_number: `TXN-${Date.now()}`,
          type: 'sale',
          status: kitchen_dashboard_enabled ? 'kitchen_queue' : 'completed',
          subtotal: transactionData.subtotal,
          tax_amount: transactionData.tax_amount,
          discount_amount: transactionData.discount_amount,
          total: transactionData.total,
          service_type: transactionData.service_type || 'takeout',
          table_id: transactionData.table_id || null,
          notes: transactionData.notes || null,
          metadata: {
            items_count: transactionData.items.length,
            payment_methods: transactionData.payments.map(p => p.method)
          },
          completed_at: kitchen_dashboard_enabled ? null : new Date().toISOString()
        } as TransactionInsert)
        .select()
        .single()

      if (transactionError) throw transactionError

      // Add transaction items
      const transactionItems = transactionData.items.map(item => ({
        transaction_id: transaction.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount,
        tax_amount: 0, // Calculate tax per item if needed
        line_total: item.line_total
      }))

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems)

      if (itemsError) throw itemsError

      // Add payments
      const payments = transactionData.payments.map(payment => ({
        transaction_id: transaction.id,
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference || null
      }))

      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(payments)

      if (paymentsError) throw paymentsError

      // Create kitchen order if kitchen dashboard is enabled
      if (kitchen_dashboard_enabled) {
        const kitchenOrderData: KitchenOrderInsert = {
          transaction_id: transaction.id,
          store_id: currentStore.id,
          order_number: `K${Date.now().toString().slice(-6)}`, // Generate kitchen order number
          status: 'new' as KitchenOrderStatus,
          priority: 'normal' as KitchenOrderPriority,
          estimated_prep_time: 15, // Default 15 minutes, can be calculated based on items
          special_instructions: transactionData.notes || undefined
        }

        const { error: kitchenOrderError } = await supabase
          .from('kitchen_orders')
          .insert(kitchenOrderData)

        if (kitchenOrderError) {
          console.error('Kitchen order creation failed:', kitchenOrderError)
          // Don't fail the entire transaction for kitchen order errors
        }
      }

      // Handle table session for dine-in orders
      if (transactionData.service_type === 'dine_in' && transactionData.table_id) {
        // Check if table has an active session
        const { data: existingSession, error: sessionCheckError } = await supabase
          .from('table_sessions')
          .select('id')
          .eq('table_id', transactionData.table_id)
          .eq('status', 'active')
          .single()

        if (sessionCheckError && sessionCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Failed to check table session:', sessionCheckError)
        }

        if (existingSession) {
          // Update existing session with transaction
          const { error: sessionUpdateError } = await supabase
            .from('table_sessions')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSession.id)

          if (sessionUpdateError) {
            console.error('Failed to update table session:', sessionUpdateError)
          }

          // Link transaction to session
          const { error: transactionUpdateError } = await supabase
            .from('transactions')
            .update({
              table_session_id: existingSession.id
            })
            .eq('id', transaction.id)

          if (transactionUpdateError) {
            console.error('Failed to link transaction to session:', transactionUpdateError)
          }
        }

        // Update table status to occupied if not already
        const { error: tableUpdateError } = await supabase
          .from('tables')
          .update({
            status: 'occupied',
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionData.table_id)
          .neq('status', 'occupied')

        if (tableUpdateError) {
          console.error('Failed to update table status:', tableUpdateError)
        }
      }

      // Update inventory for each item
      for (const item of transactionData.items) {
        if (item.product.track_inventory) {
          // Get current inventory first
          const { data: currentInventory, error: fetchError } = await supabase
            .from('inventory')
            .select('id, quantity')
            .eq('product_id', item.product.id)
            .eq('store_id', currentStore.id)
            .single()
            
          if (fetchError) {
            console.error('Failed to fetch current inventory:', fetchError)
            continue
          }
          
          // Update inventory with new quantity
          const newQuantity = Math.max(0, (currentInventory?.quantity || 0) - item.quantity)
          const { error: inventoryError } = await supabase
            .from('inventory')
            .update({
              quantity: newQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', item.product.id)
            .eq('store_id', currentStore.id)
          
          if (inventoryError) {
            console.error('Inventory update failed for product:', item.product.id, inventoryError)
            // Don't fail the entire transaction for inventory errors
          }
          
          // Log the inventory adjustment
          const { error: adjustmentError } = await supabase
            .from('inventory_adjustments')
            .insert({
              inventory_id: currentInventory.id,
              adjustment_type: 'sale',
              quantity_change: -item.quantity,
              reason: 'Sale transaction',
              reference_id: transaction.id,
              adjusted_by: (await supabase.auth.getUser()).data.user?.id!
            })
            
          if (adjustmentError) {
            console.error('Inventory adjustment log failed:', adjustmentError)
          }
        }
      }

      return transaction
    } catch (err) {
      console.error('Transaction processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process transaction')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getTransactionHistory = async (limit = 50, offset = 0) => {
    if (!currentStore) return []

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            *,
            product:products (*)
          ),
          payments (*)
        `)
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data as TransactionWithItems[]
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
      return []
    }
  }

  const getTodaysSales = async () => {
    if (!currentStore) return { count: 0, total: 0 }

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data, error } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', currentStore.id)
        .eq('status', 'completed')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())

      if (error) throw error

      return {
        count: data.length,
        total: data.reduce((sum, transaction) => sum + transaction.total, 0)
      }
    } catch (err) {
      console.error('Error fetching today\'s sales:', err)
      return { count: 0, total: 0 }
    }
  }

  const voidTransaction = async (transactionId: string, reason: string) => {
    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'cancelled',
          notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)

      if (error) throw error
      
      // TODO: Restore inventory if needed
      
    } catch (err) {
      console.error('Error voiding transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to void transaction')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    processTransaction,
    getTransactionHistory,
    getTodaysSales,
    voidTransaction
  }
}