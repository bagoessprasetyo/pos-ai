'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useStore } from '@/contexts/store-context'
import { Database } from '@/types'

type Analytics = {
  todaysSales: number
  todaysTransactions: number
  todaysItemsSold: number
  avgTransactionValue: number
  weekSales: number
  monthSales: number
  topProducts: Array<{
    id: string
    name: string
    sales: number
    quantity: number
  }>
  salesTrend: Array<{
    date: string
    sales: number
    transactions: number
  }>
  categoryPerformance: Array<{
    name: string
    sales: number
    percentage: number
  }>
  recentTransactions: Array<{
    id: string
    transaction_number: string
    total: number
    items_count: number
    created_at: string
  }>
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics>({
    todaysSales: 0,
    todaysTransactions: 0,
    todaysItemsSold: 0,
    avgTransactionValue: 0,
    weekSales: 0,
    monthSales: 0,
    topProducts: [],
    salesTrend: [],
    categoryPerformance: [],
    recentTransactions: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient<Database>()
  const { currentStore } = useStore()

  const fetchAnalytics = async () => {
    if (!currentStore?.id) {
      console.log('🚫 No current store available for analytics')
      setError('No store selected')
      setLoading(false)
      return
    }

    // Get analytics for the current store

    try {
      setLoading(true)
      setError(null)

      const today = new Date()
      // Use UTC for all date calculations to match database timestamps
      const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
      const startOfWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000))
      const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
      
      // Calculate date ranges for analytics queries
      
      // Get today's data
      const { data: todayTransactions, error: todayError } = await supabase
        .from('transactions')
        .select(`
          id,
          total,
          created_at,
          transaction_items (
            quantity
          )
        `)
        .eq('store_id', currentStore.id)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })

      if (todayError) throw todayError

      // Calculate today's metrics
      const todaysSales = todayTransactions?.reduce((sum, t) => sum + t.total, 0) || 0
      const todaysTransactions = todayTransactions?.length || 0
      const todaysItemsSold = todayTransactions?.reduce((sum, t) => 
        sum + (t.transaction_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0
      ) || 0
      const avgTransactionValue = todaysTransactions > 0 ? todaysSales / todaysTransactions : 0

      // Today's metrics calculated

      // Get week and month data
      const { data: weekTransactions, error: weekError } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', currentStore.id)
        .gte('created_at', startOfWeek.toISOString())

      if (weekError) throw weekError

      const { data: monthTransactions, error: monthError } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', currentStore.id)
        .gte('created_at', startOfMonth.toISOString())

      if (monthError) throw monthError

      const weekSales = weekTransactions?.reduce((sum, t) => sum + t.total, 0) || 0
      const monthSales = monthTransactions?.reduce((sum, t) => sum + t.total, 0) || 0

      // Get top products (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const { data: topProductsData, error: topProductsError } = await supabase
        .from('transaction_items')
        .select(`
          product_id,
          quantity,
          unit_price,
          products!inner (
            name
          ),
          transactions!inner (
            store_id,
            created_at
          )
        `)
        .eq('transactions.store_id', currentStore.id)
        .gte('transactions.created_at', thirtyDaysAgo.toISOString())

      if (topProductsError) throw topProductsError

      // Aggregate top products
      const productMap = new Map()
      topProductsData?.forEach(item => {
        const productId = item.product_id
        const productName = (item.products as any)?.name || 'Unknown Product'
        const sales = item.quantity * item.unit_price
        
        if (productMap.has(productId)) {
          const existing = productMap.get(productId)
          productMap.set(productId, {
            ...existing,
            sales: existing.sales + sales,
            quantity: existing.quantity + item.quantity
          })
        } else {
          productMap.set(productId, {
            id: productId,
            name: productName,
            sales: sales,
            quantity: item.quantity
          })
        }
      })

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)

      // Get sales trend (last 7 days)
      const salesTrend = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000))
        // Use UTC for trend day calculations too
        const startOfTrendDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
        const endOfTrendDay = new Date(startOfTrendDay.getTime() + 24 * 60 * 60 * 1000)
        
        const { data: dayTransactions } = await supabase
          .from('transactions')
          .select('total')
          .eq('store_id', currentStore.id)
          .gte('created_at', startOfTrendDay.toISOString())
          .lt('created_at', endOfTrendDay.toISOString())
        
        const sales = dayTransactions?.reduce((sum, t) => sum + t.total, 0) || 0
        const transactions = dayTransactions?.length || 0
        
        salesTrend.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales,
          transactions
        })
      }

      // Get category performance (last 30 days)
      const { data: categoryData } = await supabase
        .from('transaction_items')
        .select(`
          unit_price,
          quantity,
          products!inner (
            category_id,
            categories (
              name
            )
          ),
          transactions!inner (
            store_id,
            created_at
          )
        `)
        .eq('transactions.store_id', currentStore.id)
        .gte('transactions.created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const categoryMap = new Map()
      let totalCategorySales = 0
      
      categoryData?.forEach(item => {
        const categoryName = (item.products as any)?.categories?.name || 'Uncategorized'
        const sales = item.quantity * item.unit_price
        totalCategorySales += sales
        
        if (categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, categoryMap.get(categoryName) + sales)
        } else {
          categoryMap.set(categoryName, sales)
        }
      })

      const categoryPerformance = Array.from(categoryMap.entries())
        .map(([name, sales]) => ({
          name,
          sales,
          percentage: totalCategorySales > 0 ? (sales / totalCategorySales) * 100 : 0
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)

      // Get recent transactions
      const { data: recentTransactionsData } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_number,
          total,
          created_at,
          transaction_items (
            quantity
          )
        `)
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false })
        .limit(5)

      const recentTransactions = recentTransactionsData?.map(t => ({
        id: t.id,
        transaction_number: t.transaction_number,
        total: t.total,
        items_count: t.transaction_items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        created_at: t.created_at
      })) || []

      setAnalytics({
        todaysSales,
        todaysTransactions,
        todaysItemsSold,
        avgTransactionValue,
        weekSales,
        monthSales,
        topProducts,
        salesTrend,
        categoryPerformance,
        recentTransactions
      })

    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [currentStore?.id])

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  }
}