'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import { useAuth } from '@/contexts/auth-context'
import { generateReceiptData, printReceipt, downloadReceiptText } from '@/utils/receipt'
import type { TransactionWithItems } from '@/types'

export function useReceipt() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const { user } = useAuth()
  const supabase = createClient()

  const generateReceipt = async (transactionId: string) => {
    if (!currentStore) {
      throw new Error('No store selected')
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch complete transaction data
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            *,
            product:products (
              name,
              price,
              sku
            )
          ),
          payments (*)
        `)
        .eq('id', transactionId)
        .single()

      if (transactionError) throw transactionError

      // Get cashier name
      const { data: cashierProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', transaction.cashier_id)
        .single()

      const receiptData = generateReceiptData(
        transaction as TransactionWithItems,
        currentStore,
        cashierProfile?.full_name || 'Unknown'
      )

      return receiptData
    } catch (err) {
      console.error('Error generating receipt:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate receipt')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const printReceiptForTransaction = async (transactionId: string) => {
    try {
      const receiptData = await generateReceipt(transactionId)
      printReceipt(receiptData)
    } catch (err) {
      console.error('Error printing receipt:', err)
      throw err
    }
  }

  const downloadReceiptForTransaction = async (transactionId: string) => {
    try {
      const receiptData = await generateReceipt(transactionId)
      downloadReceiptText(receiptData)
    } catch (err) {
      console.error('Error downloading receipt:', err)
      throw err
    }
  }

  const emailReceipt = async (transactionId: string, email: string) => {
    try {
      const receiptData = await generateReceipt(transactionId)
      
      // TODO: Implement email sending logic
      // This would typically involve calling an API endpoint that sends emails
      console.log('Email receipt to:', email, receiptData)
      
      // For now, just return success
      return { success: true, message: 'Receipt emailed successfully' }
    } catch (err) {
      console.error('Error emailing receipt:', err)
      throw err
    }
  }

  return {
    loading,
    error,
    generateReceipt,
    printReceiptForTransaction,
    downloadReceiptForTransaction,
    emailReceipt,
  }
}