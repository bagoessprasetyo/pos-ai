'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useStore } from '@/contexts/store-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentStore, stores, loading: storeLoading } = useStore()
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
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              +0% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0 from yesterday
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Total active products
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+0%</div>
            <p className="text-xs text-muted-foreground">
              vs last period
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
            <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
              Start New Sale
            </button>
            <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
              Add Product
            </button>
            <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
              View Analytics
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent activity to display
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}