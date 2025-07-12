'use client'

import { useState, useEffect } from 'react'
import { useAnalytics } from '@/hooks/use-analytics'
import { useStore } from '@/contexts/store-context'
import { KPICards } from '@/components/analytics/kpi-cards'
import { SalesChart, TransactionChart } from '@/components/analytics/sales-chart'
import { TopProducts, CategoryPerformance } from '@/components/analytics/top-products'
import { RecentTransactions } from '@/components/analytics/recent-transactions'
import { BusinessInsights } from '@/components/ai/business-insights'
import { useStoreSettings } from '@/hooks/use-store-settings'
import { ForecastChart } from '@/components/ai/forecast-chart'
import { ForecastAlerts } from '@/components/ai/forecast-alerts'
import { PageErrorBoundary, ComponentErrorBoundary } from '@/components/error-boundary'
import { AnalyticsLoading, KPICardsSkeleton, ChartSkeleton } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  RefreshCw, 
  Download, 
  Filter,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { formatPrice } from '@/utils/currency'

export default function AnalyticsPage() {
  const { analytics, loading, error, refetch } = useAnalytics()
  const { currentStore, stores, loading: storeLoading } = useStore()
  const { currency, locale } = useStoreSettings()
  const [refreshing, setRefreshing] = useState(false)


  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (loading) {
    return <AnalyticsLoading />
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive mb-4">Failed to load analytics</p>
            <div className="mb-4 p-4 bg-destructive/10 rounded-lg text-sm">
              <p><strong>Error:</strong> {error}</p>
              {!currentStore && <p className="mt-2"><strong>Issue:</strong> No store selected</p>}
              {stores.length === 0 && <p className="mt-2"><strong>Issue:</strong> No stores available</p>}
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PageErrorBoundary>
      <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 md:h-8 md:w-8" />
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your business performance and insights
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              size="sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="space-y-6">
          {/* KPI Cards */}
          <ComponentErrorBoundary componentName="KPI Cards">
            <KPICards analytics={analytics} />
          </ComponentErrorBoundary>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
            <ComponentErrorBoundary componentName="Sales Chart">
              <SalesChart data={analytics.salesTrend} />
            </ComponentErrorBoundary>
            <ComponentErrorBoundary componentName="Transaction Chart">
              <TransactionChart data={analytics.salesTrend} />
            </ComponentErrorBoundary>
          </div>

          {/* Performance Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <ComponentErrorBoundary componentName="Top Products">
              <TopProducts topProducts={analytics.topProducts} />
            </ComponentErrorBoundary>
            <ComponentErrorBoundary componentName="Category Performance">
              <CategoryPerformance categoryPerformance={analytics.categoryPerformance} />
            </ComponentErrorBoundary>
            <ComponentErrorBoundary componentName="Recent Transactions">
              <RecentTransactions recentTransactions={analytics.recentTransactions} />
            </ComponentErrorBoundary>
          </div>

          {/* AI Business Insights */}
          <ComponentErrorBoundary componentName="Business Insights">
            <BusinessInsights />
          </ComponentErrorBoundary>

          {/* AI Forecasting */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <ComponentErrorBoundary componentName="Forecast Chart">
                <ForecastChart />
              </ComponentErrorBoundary>
            </div>
            <div className="xl:col-span-1">
              <ComponentErrorBoundary componentName="Forecast Alerts">
                <ForecastAlerts showHeader={false} maxAlerts={5} />
              </ComponentErrorBoundary>
            </div>
          </div>

          {/* Quick Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Best Sales Day
                  </div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {analytics.salesTrend.length > 0 
                      ? analytics.salesTrend.reduce((best, day) => 
                          day.sales > best.sales ? day : best
                        ).date 
                      : 'No data'
                    }
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-300">
                    {analytics.salesTrend.length > 0 
                      ? formatPrice(Math.max(...analytics.salesTrend.map(d => d.sales)), { currency, locale })
                      : 'N/A'
                    }
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                    Top Category
                  </div>
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">
                    {analytics.categoryPerformance[0]?.name || 'No data'}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-300">
                    {analytics.categoryPerformance[0] 
                      ? `${analytics.categoryPerformance[0].percentage.toFixed(1)}% of sales`
                      : 'N/A'
                    }
                  </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">
                    Growth Trend
                  </div>
                  <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {analytics.weekSales > 0 && analytics.monthSales > 0
                      ? `+${(((analytics.weekSales * 4) / analytics.monthSales - 1) * 100).toFixed(1)}%`
                      : 'No data'
                    }
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-300">
                    Weekly vs monthly pace
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </PageErrorBoundary>
  )
}