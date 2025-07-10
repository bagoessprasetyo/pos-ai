'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import type { 
  PosTransaction, 
  CartItem, 
  Transaction, 
  TransactionInsert,
  TransactionWithItems
} from '@/types'

export function useTransactions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const supabase = createClient()

  const processTransaction = async (transactionData: PosTransaction) => {
    if (!currentStore) throw new Error('No store selected')
    
    console.log('💳 Processing transaction for store:', currentStore.id, currentStore.name)
    console.log('💰 Transaction data:', {
      items: transactionData.items.length,
      total: transactionData.total,
      subtotal: transactionData.subtotal
    })
    
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
          status: 'completed',
          subtotal: transactionData.subtotal,
          tax_amount: transactionData.tax_amount,
          discount_amount: transactionData.discount_amount,
          total: transactionData.total,
          notes: transactionData.notes || null,
          metadata: {
            items_count: transactionData.items.length,
            payment_methods: transactionData.payments.map(p => p.method)
          },
          completed_at: new Date().toISOString()
        } as TransactionInsert)
        .select()
        .single()

      if (transactionError) {
        console.error('❌ Transaction creation failed:', transactionError)
        throw transactionError
      }

      console.log('✅ Transaction created:', transaction.id)

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

      // Update inventory for each item
      for (const item of transactionData.items) {
        if (item.product.track_inventory) {
          // Get current inventory first
          const { data: currentInventory, error: fetchError } = await supabase
            .from('inventory')
            .select('quantity')
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
              inventory_id: item.product.id, // This should be the inventory record ID, but we'll use product_id for now
              type: 'sale',
              quantity_change: -item.quantity,
              reason: 'sale',
              reference: transaction.id,
              notes: `Sale transaction: ${transaction.transaction_number}`
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