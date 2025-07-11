'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ForecastChart } from '@/components/ai/forecast-chart'
import { ForecastAlerts } from '@/components/ai/forecast-alerts'
import { useForecasting } from '@/hooks/use-forecasting'
import { 
  BarChart3, 
  Bell, 
  TrendingUp, 
  Calendar, 
  Target,
  Sparkles,
  AlertTriangle,
  Brain
} from 'lucide-react'

export default function ForecastingPage() {
  const { alerts, hasForecasts, hasAlerts, activeAlerts } = useForecasting()
  const [activeTab, setActiveTab] = useState('overview')

  const alertCounts = {
    total: alerts.length,
    active: activeAlerts.length,
    high: alerts.filter(a => a.severity === 'high').length,
    opportunities: alerts.filter(a => a.type === 'opportunity').length,
    warnings: alerts.filter(a => a.type === 'warning').length
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              AI Forecasting
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered sales forecasting and predictive analytics
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span>{hasForecasts ? 'Forecast Active' : 'No Forecast'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bell className="h-4 w-4 text-yellow-600" />
                <span>{alertCounts.active} Active Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 md:p-6 border-b">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{alertCounts.total}</div>
            <div className="text-xs text-blue-600">Total Alerts</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-lg font-bold text-yellow-600">{alertCounts.active}</div>
            <div className="text-xs text-yellow-600">Active Alerts</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{alertCounts.high}</div>
            <div className="text-xs text-red-600">High Priority</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{alertCounts.opportunities}</div>
            <div className="text-xs text-green-600">Opportunities</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">{alertCounts.warnings}</div>
            <div className="text-xs text-purple-600">Warnings</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="forecasts" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Forecasts
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <ForecastChart />
              </div>
              <div className="xl:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Recent Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ForecastAlerts showHeader={false} maxAlerts={5} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Forecast Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">87%</div>
                  <p className="text-sm text-muted-foreground">
                    Average accuracy over last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Growth Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">+12.3%</div>
                  <p className="text-sm text-muted-foreground">
                    Predicted growth next month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    Peak Sales Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Friday</div>
                  <p className="text-sm text-muted-foreground">
                    Consistently highest sales day
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forecasts" className="space-y-6">
            <ForecastChart />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <ForecastAlerts />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}