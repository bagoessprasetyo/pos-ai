import React from 'react'
import { Loader2, Package, BarChart3, ShoppingCart, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Basic spinner component
export function LoadingSpinner({ 
  size = 'default',
  className = ''
}: {
  size?: 'sm' | 'default' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  )
}

// Full page loading component
export function PageLoading({ 
  message = 'Loading...',
  icon: Icon = Loader2
}: {
  message?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Icon className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

// Card skeleton for loading states
export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}

// Table skeleton for data tables
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Product grid skeleton
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="h-[160px] md:h-[140px]">
          <CardContent className="p-3 md:p-4 flex flex-col h-full justify-between">
            <div className="flex-1 flex items-center justify-center">
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/2 mx-auto" />
              <Skeleton className="h-3 w-2/3 mx-auto" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// KPI cards skeleton for analytics
export function KPICardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Chart skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-end" style={{ height: height }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="w-8" 
                style={{ height: `${Math.random() * 60 + 40}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Specific loading components for different pages
export function ProductsLoading() {
  return <PageLoading message="Loading products..." icon={Package} />
}

export function AnalyticsLoading() {
  return <PageLoading message="Loading analytics..." icon={BarChart3} />
}

export function POSLoading() {
  return <PageLoading message="Loading POS..." icon={ShoppingCart} />
}

export function SettingsLoading() {
  return <PageLoading message="Loading settings..." icon={Settings} />
}

// Generic list skeleton
export function ListSkeleton({ 
  count = 5,
  showAvatar = false 
}: { 
  count?: number
  showAvatar?: boolean 
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

// Button loading state
export function ButtonLoading({ 
  children,
  loading = false,
  ...props 
}: {
  children: React.ReactNode
  loading?: boolean
  [key: string]: any
}) {
  return (
    <button disabled={loading} {...props}>
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </button>
  )
}

// Form loading overlay
export function FormLoading({ message = 'Saving...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <LoadingSpinner />
        <span>{message}</span>
      </div>
    </div>
  )
}