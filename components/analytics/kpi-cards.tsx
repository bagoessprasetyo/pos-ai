'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/utils/currency'
import { useStoreSettings } from '@/hooks/use-store-settings'
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp,
  Calendar,
  CalendarDays 
} from 'lucide-react'

interface KPICardsProps {
  analytics: {
    todaysSales: number
    todaysTransactions: number
    todaysItemsSold: number
    avgTransactionValue: number
    weekSales: number
    monthSales: number
    trends?: {
      sales: { trend: string; trendUp: boolean }
      transactions: { trend: string; trendUp: boolean }
      itemsSold: { trend: string; trendUp: boolean }
      avgValue: { trend: string; trendUp: boolean }
      week: { trend: string; trendUp: boolean }
      month: { trend: string; trendUp: boolean }
    }
  }
}

export function KPICards({ analytics }: KPICardsProps) {
  const { trends } = analytics
  const { currency, locale } = useStoreSettings()
  
  const kpis = [
    {
      title: "Today's Sales",
      value: formatPrice(analytics.todaysSales, { currency, locale }),
      icon: DollarSign,
      trend: trends?.sales.trend || "0%",
      trendUp: trends?.sales.trendUp ?? true,
      description: "vs yesterday"
    },
    {
      title: "Transactions",
      value: analytics.todaysTransactions.toString(),
      icon: ShoppingCart,
      trend: trends?.transactions.trend || "0%",
      trendUp: trends?.transactions.trendUp ?? true,
      description: "today"
    },
    {
      title: "Items Sold",
      value: analytics.todaysItemsSold.toString(),
      icon: Package,
      trend: trends?.itemsSold.trend || "0%",
      trendUp: trends?.itemsSold.trendUp ?? true,
      description: "today"
    },
    {
      title: "Avg. Transaction",
      value: formatPrice(analytics.avgTransactionValue, { currency, locale }),
      icon: TrendingUp,
      trend: trends?.avgValue.trend || "0%",
      trendUp: trends?.avgValue.trendUp ?? true,
      description: "per sale"
    },
    {
      title: "Week Sales",
      value: formatPrice(analytics.weekSales, { currency, locale }),
      icon: Calendar,
      trend: trends?.week.trend || "0%",
      trendUp: trends?.week.trendUp ?? true,
      description: "last 7 days"
    },
    {
      title: "Month Sales",
      value: formatPrice(analytics.monthSales, { currency, locale }),
      icon: CalendarDays,
      trend: trends?.month.trend || "0%",
      trendUp: trends?.month.trendUp ?? true,
      description: "last 30 days"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-6">
      {kpis.map((kpi, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{kpi.value}</div>
            <div className="flex items-center text-xs">
              <span className={`font-medium ${kpi.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.trend}
              </span>
              <span className="text-muted-foreground ml-1">{kpi.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}