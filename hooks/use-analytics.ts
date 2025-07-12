'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import { useAuth } from '@/contexts/auth-context'
import { errorHandler, withRetry } from '@/lib/error-handler'
import { cache, generateCacheKey } from '@/lib/cache'
import { useDebouncedCallback } from '@/lib/performance'
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
  trends?: {
    sales: { trend: string; trendUp: boolean }
    transactions: { trend: string; trendUp: boolean }
    itemsSold: { trend: string; trendUp: boolean }
    avgValue: { trend: string; trendUp: boolean }
    week: { trend: string; trendUp: boolean }
    month: { trend: string; trendUp: boolean }
  }
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
  
  const supabase = createClient()
  const { currentStore } = useStore()
  const { user, loading: authLoading } = useAuth()

  const fetchAnalytics = useDebouncedCallback(async () => {
    // Wait for auth to complete loading
    if (authLoading) {
      return
    }

    if (!user) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    if (!currentStore?.id) {
      setError('No store selected')
      setLoading(false)
      return
    }

    // Generate cache key based on store and current date
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = generateCacheKey('analytics', currentStore.id, today)

    try {
      setLoading(true)
      setError(null)

      // Try to get from cache first
      const cachedData = await cache.get<Analytics>(cacheKey, {
        ttl: 2 * 60 * 1000, // 2 minutes cache
        storage: 'memory'
      })

      if (cachedData) {
        setAnalytics(cachedData)
        setLoading(false)
        return
      }

      // Verify user has access to this store
      const { data: storeAccess, error: storeAccessError } = await supabase
        .from('stores')
        .select('id, name, owner_id')
        .eq('id', currentStore.id)
        .single()

      // Check if user is staff if not owner
      if (storeAccessError || storeAccess?.owner_id !== user.id) {
        const { data: staffAccess, error: staffAccessError } = await supabase
          .from('store_staff')
          .select('id, store_id, user_id, role, is_active')
          .eq('store_id', currentStore.id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (staffAccessError || !staffAccess) {
          throw new Error('Access denied to this store')
        }
      }
      const now = new Date()
      
      // Create date ranges for analytics calculations
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
      const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000)
      
      const todayStartISO = todayStart.toISOString()
      const todayEndISO = todayEnd.toISOString()
      const yesterdayStartISO = yesterdayStart.toISOString()
      const yesterdayEndISO = yesterdayEnd.toISOString()

      // Get today's transactions
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
        .eq('status', 'completed')
        .gte('created_at', todayStartISO)
        .lte('created_at', todayEndISO)
        .order('created_at', { ascending: false })

      if (todayError) {
        throw todayError
      }

      // Get yesterday's transactions for comparison
      const { data: yesterdayTransactions, error: yesterdayError } = await supabase
        .from('transactions')
        .select('id, total, transaction_items(quantity)')
        .eq('store_id', currentStore.id)
        .eq('status', 'completed')
        .gte('created_at', yesterdayStartISO)
        .lte('created_at', yesterdayEndISO)

      if (yesterdayError) {
        throw yesterdayError
      }

      // Calculate today's metrics
      const todaysSales = todayTransactions?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || 0
      const todaysTransactionsCount = todayTransactions?.length || 0
      const todaysItemsSold = todayTransactions?.reduce((sum, t) => {
        const itemsCount = t.transaction_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0
        return sum + itemsCount
      }, 0) || 0
      const avgTransactionValue = todaysTransactionsCount > 0 ? todaysSales / todaysTransactionsCount : 0

      // Calculate yesterday's metrics for comparison
      const yesterdaysSales = yesterdayTransactions?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || 0
      const yesterdaysTransactionsCount = yesterdayTransactions?.length || 0
      const yesterdaysItemsSold = yesterdayTransactions?.reduce((sum, t) => {
        const itemsCount = t.transaction_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0
        return sum + itemsCount
      }, 0) || 0
      const yesterdayAvgTransactionValue = yesterdaysTransactionsCount > 0 ? yesterdaysSales / yesterdaysTransactionsCount : 0

      // Calculate week sales (last 7 days) and previous week for comparison
      const weekStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      weekStart.setHours(0, 0, 0, 0)
      const weekStartISO = weekStart.toISOString()
      
      const previousWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
      const previousWeekEnd = new Date(weekStart.getTime() - 1000) // Just before current week
      const previousWeekStartISO = previousWeekStart.toISOString()
      const previousWeekEndISO = previousWeekEnd.toISOString()
      
      const { data: weekTransactions, error: weekError } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', currentStore.id)
        .eq('status', 'completed')
        .gte('created_at', weekStartISO)
        .lte('created_at', todayEndISO)

      const { data: previousWeekTransactions, error: previousWeekError } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', currentStore.id)
        .eq('status', 'completed')
        .gte('created_at', previousWeekStartISO)
        .lte('created_at', previousWeekEndISO)

      if (weekError) throw weekError
      if (previousWeekError) throw previousWeekError

      const weekSales = weekTransactions?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || 0
      const previousWeekSales = previousWeekTransactions?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || 0

      // Calculate month sales (last 30 days) and previous month for comparison
      const monthStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
      monthStart.setHours(0, 0, 0, 0)
      const monthStartISO = monthStart.toISOString()
      
      const previousMonthStart = new Date(monthStart.getTime() - 30 * 24 * 60 * 60 * 1000)
      const previousMonthEnd = new Date(monthStart.getTime() - 1000)
      const previousMonthStartISO = previousMonthStart.toISOString()
      const previousMonthEndISO = previousMonthEnd.toISOString()
      
      const { data: monthTransactions, error: monthError } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', currentStore.id)
        .eq('status', 'completed')
        .gte('created_at', monthStartISO)
        .lte('created_at', todayEndISO)

      const { data: previousMonthTransactions, error: previousMonthError } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', currentStore.id)
        .eq('status', 'completed')
        .gte('created_at', previousMonthStartISO)
        .lte('created_at', previousMonthEndISO)

      if (monthError) throw monthError
      if (previousMonthError) throw previousMonthError

      const monthSales = monthTransactions?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || 0
      const previousMonthSales = previousMonthTransactions?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || 0

      // Get top products (last 30 days)
      const { data: topProductsData, error: topProductsError } = await supabase
        .from('transaction_items')
        .select(`
          quantity,
          unit_price,
          products (
            id,
            name
          ),
          transactions!inner (
            created_at,
            store_id,
            status
          )
        `)
        .eq('transactions.store_id', currentStore.id)
        .eq('transactions.status', 'completed')
        .gte('transactions.created_at', monthStartISO)

      if (topProductsError) throw topProductsError

      // Group and calculate top products
      const productSales = new Map<string, { name: string; sales: number; quantity: number }>()
      
      topProductsData?.forEach(item => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
        const productId = product?.id?.toString() ?? ''

        const productName = product?.name
        if (!productId || !productName) return

        const sales = (Number(item.unit_price) || 0) * (item.quantity || 0)
        const quantity = item.quantity || 0

        if (productSales.has(productId)) {
          const existing = productSales.get(productId)!
          existing.sales += sales
          existing.quantity += quantity
        } else {
          productSales.set(productId, {
            name: productName,
            sales,
            quantity
          })
        }
      })

      const topProducts = Array.from(productSales.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)

      // Get sales trend (last 30 days daily data)
      const { data: salesTrendData, error: salesTrendError } = await supabase
        .from('transactions')
        .select('total, created_at')
        .eq('store_id', currentStore.id)
        .eq('status', 'completed')
        .gte('created_at', monthStartISO)
        .lte('created_at', todayEndISO)

      if (salesTrendError) throw salesTrendError

      // Group sales by date
      const dailySales = new Map<string, { sales: number; transactions: number }>()
      
      salesTrendData?.forEach(transaction => {
        const date = new Date(transaction.created_at).toISOString().split('T')[0]
        const sales = Number(transaction.total) || 0

        if (dailySales.has(date)) {
          const existing = dailySales.get(date)!
          existing.sales += sales
          existing.transactions += 1
        } else {
          dailySales.set(date, { sales, transactions: 1 })
        }
      })

      // Generate sales trend array for last 30 days
      const salesTrend = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const dayData = dailySales.get(dateStr) || { sales: 0, transactions: 0 }
        
        salesTrend.push({
          date: dateStr,
          sales: dayData.sales,
          transactions: dayData.transactions
        })
      }

      // Get category performance (last 30 days)
      const { data: categoryData, error: categoryError } = await supabase
        .from('transaction_items')
        .select(`
          quantity,
          unit_price,
          products (
            categories (
              id,
              name
            )
          ),
          transactions!inner (
            created_at,
            store_id,
            status
          )
        `)
        .eq('transactions.store_id', currentStore.id)
        .eq('transactions.status', 'completed')
        .gte('transactions.created_at', monthStartISO)

      if (categoryError) throw categoryError

      // Group and calculate category performance
      const categorySales = new Map<string, number>()
      let totalCategorySales = 0

      categoryData?.forEach(item => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
        const category = Array.isArray(product?.categories) ? product.categories[0] : product?.categories
        const categoryName = category?.name || 'Uncategorized'
        const sales = (Number(item.unit_price) || 0) * (item.quantity || 0)
        
        totalCategorySales += sales
        categorySales.set(categoryName, (categorySales.get(categoryName) || 0) + sales)
      })

      const categoryPerformance = Array.from(categorySales.entries())
        .map(([name, sales]) => ({
          name,
          sales,
          percentage: totalCategorySales > 0 ? (sales / totalCategorySales) * 100 : 0
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 6)

      // Get recent transactions
      const { data: recentTransactions, error: recentError } = await supabase
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
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentError) throw recentError

      const formattedRecentTransactions = recentTransactions?.map(t => ({
        id: t.id,
        transaction_number: t.transaction_number,
        total: Number(t.total) || 0,
        items_count: t.transaction_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        created_at: t.created_at
      })) || []

      // Calculate trend percentages
      const calculateTrend = (current: number, previous: number): { trend: string; trendUp: boolean } => {
        if (previous === 0) {
          return { trend: current > 0 ? '+100%' : '0%', trendUp: current >= 0 }
        }
        const percentage = ((current - previous) / previous) * 100
        const trendUp = percentage >= 0
        const trend = `${trendUp ? '+' : ''}${percentage.toFixed(1)}%`
        return { trend, trendUp }
      }

      // Calculate trends
      const salesTodayTrend = calculateTrend(todaysSales, yesterdaysSales)
      const transactionsTrend = calculateTrend(todaysTransactionsCount, yesterdaysTransactionsCount)
      const itemsSoldTrend = calculateTrend(todaysItemsSold, yesterdaysItemsSold)
      const avgValueTrend = calculateTrend(avgTransactionValue, yesterdayAvgTransactionValue)
      const weekTrend = calculateTrend(weekSales, previousWeekSales)
      const monthTrend = calculateTrend(monthSales, previousMonthSales)

      const finalAnalytics = {
        todaysSales,
        todaysTransactions: todaysTransactionsCount,
        todaysItemsSold,
        avgTransactionValue,
        weekSales,
        monthSales,
        topProducts,
        salesTrend,
        categoryPerformance,
        recentTransactions: formattedRecentTransactions,
        trends: {
          sales: salesTodayTrend,
          transactions: transactionsTrend,
          itemsSold: itemsSoldTrend,
          avgValue: avgValueTrend,
          week: weekTrend,
          month: monthTrend
        }
      }

      setAnalytics(finalAnalytics)

      // Cache the result
      await cache.set(cacheKey, finalAnalytics, {
        ttl: 2 * 60 * 1000, // 2 minutes cache
        storage: 'memory'
      })

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch analytics')
      errorHandler.logError(error, {
        userId: user?.id,
        storeId: currentStore?.id,
        action: 'fetch_analytics',
        component: 'use-analytics'
      })
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, 500)

  useEffect(() => {
    fetchAnalytics()
  }, [currentStore?.id, user, authLoading])

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  }
}