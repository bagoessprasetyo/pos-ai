'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import { useAuth } from '@/contexts/auth-context'
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
  
  const supabase = createClient()
  const { currentStore } = useStore()
  const { user, loading: authLoading } = useAuth()

  const fetchAnalytics = async () => {
    // Wait for auth to complete loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...')
      return
    }

    if (!user) {
      console.log('🚫 No authenticated user available')
      setError('Authentication required')
      setLoading(false)
      return
    }

    if (!currentStore?.id) {
      console.log('🚫 No current store available for analytics')
      setError('No store selected')
      setLoading(false)
      return
    }

    console.log('📊 Fetching analytics for store:', currentStore.id, currentStore.name)

    try {
      setLoading(true)
      setError(null)

      console.log('🔐 Using authenticated user from context:', {
        userId: user.id,
        email: user.email || user.profile?.email
      })

      // DEBUG: Test if user can access this store
      const { data: storeAccess, error: storeAccessError } = await supabase
        .from('stores')
        .select('id, name, owner_id')
        .eq('id', currentStore.id)
        .single()

      console.log('🏪 Store access test:', {
        requestedStoreId: currentStore.id,
        storeAccess,
        storeAccessError,
        userIsOwner: storeAccess?.owner_id === user.id
      })

      // DEBUG: Test if user has staff access
      const { data: staffAccess, error: staffAccessError } = await supabase
        .from('store_staff')
        .select('id, store_id, user_id, role, is_active')
        .eq('store_id', currentStore.id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      console.log('👥 Staff access test:', {
        staffAccess,
        staffAccessError
      })
      const now = new Date()
      
      // Create today's date range in local timezone, then convert to ISO
      // This ensures we're comparing against the correct day regardless of timezone
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      
      const todayStartISO = todayStart.toISOString()
      const todayEndISO = todayEnd.toISOString()
      
      console.log('📅 FIXED Date ranges (local timezone to ISO):', {
        now: now.toISOString(),
        todayStartISO,
        todayEndISO,
        currentStoreId: currentStore.id,
        localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })

      // Test: First get ALL transactions for this store to see what we have
      const { data: allTransactions, error: allError } = await supabase
        .from('transactions')
        .select('id, total, created_at, status')
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false })

      console.log('🔍 ALL transactions for store:', {
        count: allTransactions?.length || 0,
        error: allError,
        sample: allTransactions?.slice(0, 3)
      })

      // Test: Try to get today's transactions using a simpler approach
      const { data: testToday, error: testError } = await supabase
        .from('transactions')
        .select('id, total, created_at, status')
        .eq('store_id', currentStore.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10)

      console.log('🧪 SIMPLE TEST - Recent completed transactions:', {
        count: testToday?.length || 0,
        error: testError,
        data: testToday?.map(t => ({
          id: t.id,
          total: t.total,
          created_at: t.created_at,
          date_only: t.created_at.split('T')[0]
        }))
      })

      // Now test today's query with corrected ISO timestamps
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

      console.log('📈 Today\'s transactions DETAILED (ISO):', {
        queryParams: {
          store_id: currentStore.id,
          status: 'completed',
          gte_created_at: todayStartISO,
          lte_created_at: todayEndISO
        },
        resultCount: todayTransactions?.length || 0,
        error: todayError,
        rawResults: todayTransactions
      })

      if (todayError) {
        console.error('❌ Today transactions error:', todayError)
        throw todayError
      }

      // Calculate today's metrics with detailed logging
      const todaysSales = todayTransactions?.reduce((sum, t) => {
        const amount = Number(t.total) || 0
        console.log(`Transaction ${t.id}: ${amount}`)
        return sum + amount
      }, 0) || 0
      
      const todaysTransactions = todayTransactions?.length || 0
      const todaysItemsSold = todayTransactions?.reduce((sum, t) => {
        const itemsCount = t.transaction_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0
        return sum + itemsCount
      }, 0) || 0
      const avgTransactionValue = todaysTransactions > 0 ? todaysSales / todaysTransactions : 0

      console.log('📊 Today\'s calculated metrics:', {
        todaysSales,
        todaysTransactions,
        todaysItemsSold,
        avgTransactionValue,
        rawTransactionData: todayTransactions?.map(t => ({ id: t.id, total: t.total }))
      })

      // Calculate week sales (last 7 days)
      const weekStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) // 6 days ago + today = 7 days
      weekStart.setHours(0, 0, 0, 0)
      const weekStartISO = weekStart.toISOString()
      
      const { data: weekTransactions, error: weekError } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', currentStore.id)
        .eq('status', 'completed')
        .gte('created_at', weekStartISO)
        .lte('created_at', todayEndISO)

      const weekSales = weekTransactions?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || 0

      console.log('📅 Week sales calculation:', {
        weekStartISO,
        todayEndISO,
        weekTransactionsCount: weekTransactions?.length || 0,
        weekSales,
        weekError
      })

      // Calculate month sales (last 30 days)
      const monthStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000) // 29 days ago + today = 30 days
      monthStart.setHours(0, 0, 0, 0)
      const monthStartISO = monthStart.toISOString()
      
      const { data: monthTransactions, error: monthError } = await supabase
        .from('transactions')
        .select('total')
        .eq('store_id', currentStore.id)
        .eq('status', 'completed')
        .gte('created_at', monthStartISO)
        .lte('created_at', todayEndISO)

      const monthSales = monthTransactions?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) || 0

      console.log('📅 Month sales calculation:', {
        monthStartISO,
        todayEndISO,
        monthTransactionsCount: monthTransactions?.length || 0,
        monthSales,
        monthError
      })

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

      const formattedRecentTransactions = recentTransactions?.map(t => ({
        id: t.id,
        transaction_number: t.transaction_number,
        total: Number(t.total) || 0,
        items_count: t.transaction_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        created_at: t.created_at
      })) || []

      console.log('📋 Recent transactions:', {
        count: formattedRecentTransactions.length,
        recentError
      })

      // For now, set these to empty arrays - can be implemented later
      const topProducts: any[] = []
      const salesTrend: any[] = []
      const categoryPerformance: any[] = []

      const finalAnalytics = {
        todaysSales,
        todaysTransactions,
        todaysItemsSold,
        avgTransactionValue,
        weekSales,
        monthSales,
        topProducts,
        salesTrend,
        categoryPerformance,
        recentTransactions: formattedRecentTransactions
      }

      console.log('✅ FINAL analytics result:', finalAnalytics)
      setAnalytics(finalAnalytics)

    } catch (err) {
      console.error('❌ Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

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