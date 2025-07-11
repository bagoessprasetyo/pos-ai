'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useStore } from '@/contexts/store-context'
import { useAnalytics } from '@/hooks/use-analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function calculateGrowth(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const growth = ((current - previous) / previous) * 100
  return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentStore, stores, loading: storeLoading } = useStore()
  const { analytics, loading: analyticsLoading, error: analyticsError, refetch } = useAnalytics()
  const router = useRouter()

  useEffect(() => {
    // Only attempt redirect when both auth and store contexts are fully loaded
    if (authLoading || storeLoading) {
      return // Still loading, wait
    }

    // If user is authenticated but has no stores, redirect to onboarding
    if (user && stores.length === 0) {
      console.log('Dashboard: User has no stores, redirecting to onboarding')
      router.push('/onboarding')
      return
    }

    // If no user after loading is complete, middleware should handle redirect
    if (!user) {
      console.log('Dashboard: No authenticated user found')
      return
    }
  }, [user, authLoading, storeLoading, stores.length, router])

  // Show loading while either context is loading
  if (authLoading || storeLoading) {
    return <div>Loading...</div>
  }

  // If no user, let middleware handle redirect (shouldn't reach here)
  if (!user) {
    return <div>Redirecting to login...</div>
  }

  // If no stores, show loading while redirect happens
  if (stores.length === 0) {
    return <div>Setting up your store...</div>
  }

  // Debug information
  // console.log('Dashboard Debug Info:', {
  //   currentStore: currentStore?.id,
  //   storeName: currentStore?.name,
  //   analyticsLoading,
  //   analyticsError,
  //   analytics: {
  //     todaysSales: analytics.todaysSales,
  //     todaysTransactions: analytics.todaysTransactions,
  //     weekSales: analytics.weekSales,
  //     monthSales: analytics.monthSales
  //   }
  // })

  // Calculate some derived metrics for display
  const yesterdaySales = analytics.salesTrend.length >= 2 ? analytics.salesTrend[analytics.salesTrend.length - 2]?.sales || 0 : 0
  const lastWeekSales = analytics.weekSales - analytics.todaysSales
  
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.profile?.full_name || user.email}
        </h1>
        <p className="text-muted-foreground">
          {currentStore ? `Managing ${currentStore.name}` : 'No store selected'}
        </p>
        
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <strong>Debug:</strong> Store ID: {currentStore?.id} | 
            Analytics Loading: {analyticsLoading.toString()} | 
            Error: {analyticsError || 'None'} |
            Today's Sales: {analytics.todaysSales}
          </div>
        )}
      </div>

      {/* Analytics Error Display */}
      {analyticsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-800 font-medium">Analytics Error</p>
                <p className="text-red-600 text-sm">{analyticsError}</p>
              </div>
              <button 
                onClick={refetch}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsLoading ? '...' : formatCurrency(analytics.todaysSales)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculateGrowth(analytics.todaysSales, yesterdaySales)} from yesterday
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsLoading ? '...' : analytics.todaysTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {analyticsLoading ? '...' : formatCurrency(analytics.avgTransactionValue)} per transaction
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Week Sales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsLoading ? '...' : formatCurrency(analytics.weekSales)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.todaysItemsSold} items sold today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsLoading ? '...' : formatCurrency(analytics.monthSales)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculateGrowth(analytics.weekSales, lastWeekSales)} vs last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button 
              onClick={() => router.push('/dashboard/pos')}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              Start New Sale
            </button>
            <button 
              onClick={() => router.push('/dashboard/products')}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              Add Product
            </button>
            <button 
              onClick={() => router.push('/dashboard/analytics')}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              View Analytics
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <p className="text-sm text-muted-foreground">Loading recent transactions...</p>
            ) : analytics.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent transactions</p>
            ) : (
              <div className="space-y-2">
                {analytics.recentTransactions.slice(0, 3).map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{transaction.transaction_number}</p>
                      <p className="text-muted-foreground">
                        {transaction.items_count} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(transaction.total)}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {analytics.recentTransactions.length > 3 && (
                  <button 
                    onClick={() => router.push('/dashboard/transactions')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View all transactions →
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      {!analyticsLoading && analytics.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Products (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topProducts.map((product, index) => (
                <div key={product.id} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(product.sales)}</p>
                    <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}