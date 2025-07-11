'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  AreaChart,
  ReferenceLine
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar, 
  Target,
  AlertCircle,
  Zap,
  RefreshCw
} from 'lucide-react'
import { useForecasting, type ForecastData } from '@/hooks/use-forecasting'
import { formatPrice } from '@/utils/currency'

interface ForecastChartProps {
  className?: string
}

export function ForecastChart({ className = '' }: ForecastChartProps) {
  const {
    forecasts,
    insights,
    loading,
    error,
    generateForecast,
    calculateTrends,
    hasForecasts
  } = useForecasting()

  const [forecastDays, setForecastDays] = useState(30)
  const [chartType, setChartType] = useState<'line' | 'area'>('area')

  // Prepare chart data
  const chartData = useMemo(() => {
    return forecasts.map(forecast => ({
      date: new Date(forecast.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      fullDate: forecast.date,
      predicted: forecast.predicted_sales,
      lower: forecast.confidence_interval.lower,
      upper: forecast.confidence_interval.upper,
      actual: forecast.actual_sales,
      transactions: forecast.predicted_transactions
    }))
  }, [forecasts])

  // Calculate trends
  const trends = useMemo(() => {
    return calculateTrends(forecasts)
  }, [forecasts, calculateTrends])

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!hasForecasts) return null

    const totalPredicted = forecasts.reduce((sum, f) => sum + f.predicted_sales, 0)
    const avgDaily = totalPredicted / forecasts.length
    const maxDay = forecasts.reduce((max, f) => 
      f.predicted_sales > max.predicted_sales ? f : max
    )
    const minDay = forecasts.reduce((min, f) => 
      f.predicted_sales < min.predicted_sales ? f : min
    )

    return {
      totalPredicted,
      avgDaily,
      maxDay,
      minDay,
      totalTransactions: forecasts.reduce((sum, f) => sum + f.predicted_transactions, 0)
    }
  }, [forecasts, hasForecasts])

  const handleGenerateForecast = async () => {
    await generateForecast(forecastDays)
  }

  if (error) {
    return (
      <Card className={`border-red-200 bg-red-50 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Forecast Unavailable</h3>
              <p className="text-sm text-red-600/80">{error}</p>
            </div>
          </div>
          <Button 
            onClick={handleGenerateForecast} 
            variant="outline" 
            size="sm" 
            className="mt-3"
            disabled={loading}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Forecast
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Sales Forecast
                  <Badge variant="outline" className="text-xs">
                    AI-Powered
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {hasForecasts 
                    ? `${forecasts.length} day forecast with confidence intervals`
                    : 'Generate AI-powered sales predictions'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={forecastDays} 
                onChange={(e) => setForecastDays(Number(e.target.value))}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
              <Button
                onClick={handleGenerateForecast}
                disabled={loading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {loading ? 'Generating...' : 'Generate Forecast'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Summary Stats */}
        {summaryStats && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {formatPrice(summaryStats.totalPredicted)}
                </div>
                <div className="text-xs text-blue-600">Total Predicted</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {formatPrice(summaryStats.avgDaily)}
                </div>
                <div className="text-xs text-green-600">Daily Average</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {formatPrice(summaryStats.maxDay.predicted_sales)}
                </div>
                <div className="text-xs text-purple-600">Best Day</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">
                  {summaryStats.totalTransactions}
                </div>
                <div className="text-xs text-orange-600">Total Transactions</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Chart */}
      {hasForecasts ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Forecast Chart</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={chartType === 'line' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('line')}
                >
                  Line
                </Button>
                <Button
                  variant={chartType === 'area' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('area')}
                >
                  Area
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatPrice(value),
                        name === 'predicted' ? 'Predicted Sales' : 
                        name === 'upper' ? 'Upper Bound' : 
                        name === 'lower' ? 'Lower Bound' : 'Actual Sales'
                      ]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.1}
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#ffffff"
                      fillOpacity={1}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                    {chartData.some(d => d.actual) && (
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    )}
                  </AreaChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatPrice(value),
                        name === 'predicted' ? 'Predicted Sales' : 
                        name === 'upper' ? 'Upper Bound' : 
                        name === 'lower' ? 'Lower Bound' : 'Actual Sales'
                      ]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="upper"
                      stroke="#93c5fd"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <Line
                      type="monotone"
                      dataKey="lower"
                      stroke="#93c5fd"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    {chartData.some(d => d.actual) && (
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Forecast Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate AI-powered sales forecasts to see predictions and trends.
            </p>
            <Button onClick={handleGenerateForecast} disabled={loading} className="gap-2">
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Generate Forecast
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Forecast Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {insights.growth_rate > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <h4 className="font-semibold">Growth Trend</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {insights.growth_rate > 0 ? 'Positive' : 'Negative'} growth of{' '}
                    <span className="font-semibold">
                      {Math.abs(insights.growth_rate).toFixed(1)}%
                    </span>
                  </p>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold">Peak Days</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {insights.peak_days.join(', ')}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Seasonality Pattern</h4>
                <p className="text-sm text-muted-foreground">
                  {insights.seasonality_pattern}
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Recommended Actions</h4>
                <ul className="space-y-1">
                  {insights.recommended_actions.map((action, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  Accuracy: {(insights.accuracy_score * 100).toFixed(0)}%
                </Badge>
                <span>•</span>
                <span>Period: {insights.period}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}