'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/contexts/store-context'
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Target,
  DollarSign,
  Clock,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lightbulb
} from 'lucide-react'
import { formatPrice } from '@/utils/currency'

interface InventoryOptimization {
  overview: {
    total_products: number
    products_analyzed: number
    high_priority_actions: number
    potential_savings: number
    revenue_opportunities: number
    health_score: number
    last_analyzed: string
    recommendations_count: number
  }
  recommendations: Array<{
    product_id: string
    product_name: string
    sku: string
    category: string
    current_stock: number
    recommended_reorder_point: number
    recommended_safety_stock: number
    daily_usage: number
    abc_classification: string
    priority: 'critical' | 'high' | 'medium' | 'low'
    issue_type: string
    recommendations: string[]
    warnings: string[]
    financial_impact: {
      cost_savings: number
      revenue_opportunity: number
      carrying_cost_reduction: number
    }
    velocity_metrics: {
      daily_average: number
      trend: string
      volatility: number
      total_sold: number
      days_tracked: number
    }
    seasonality_info: {
      seasonal_factor: number
      peak_months: number[]
      average_monthly_sales: number
    }
  }>
  strategic_insights: {
    key_insights: string[]
    actionable_steps: string[]
    next_review_date: string
  }
  abc_analysis: {
    a_products: number
    b_products: number
    c_products: number
  }
  optimization_summary: {
    overstocked_products: number
    understocked_products: number
    slow_moving_products: number
    reorder_recommendations: number
  }
}

export function InventoryOptimizer() {
  const { currentStore } = useStore()
  const [optimization, setOptimization] = useState<InventoryOptimization | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOptimization = async () => {
    if (!currentStore?.id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/inventory-optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: currentStore.id
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch inventory optimization')
      }

      const data = await response.json()
      setOptimization(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOptimization()
  }, [currentStore?.id])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Analyzing inventory...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button onClick={fetchOptimization} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!optimization) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No inventory data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      case 'high': return <AlertCircle className="h-4 w-4" />
      case 'medium': return <Clock className="h-4 w-4" />
      case 'low': return <CheckCircle className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Health Score</p>
                <p className={`text-2xl font-bold ${getHealthScoreColor(optimization.overview.health_score)}`}>
                  {optimization.overview.health_score}%
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={optimization.overview.health_score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority Actions</p>
                <p className="text-2xl font-bold text-red-600">
                  {optimization.overview.high_priority_actions}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Potential Savings</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(optimization.overview.potential_savings)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products Analyzed</p>
                <p className="text-2xl font-bold">
                  {optimization.overview.products_analyzed}
                </p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="analysis">ABC Analysis</TabsTrigger>
          <TabsTrigger value="insights">Strategic Insights</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Inventory Recommendations</h3>
            <Button onClick={fetchOptimization} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analysis
            </Button>
          </div>

          <div className="space-y-4">
            {optimization.recommendations.map((rec, index) => (
              <Card key={rec.product_id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base">{rec.product_name}</CardTitle>
                        <Badge variant={getPriorityBadgeVariant(rec.priority)}>
                          {getPriorityIcon(rec.priority)}
                          <span className="ml-1 capitalize">{rec.priority}</span>
                        </Badge>
                        <Badge variant="outline">{rec.abc_classification}-Class</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        SKU: {rec.sku} • Category: {rec.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Current Stock</p>
                      <p className="text-lg font-semibold">{rec.current_stock}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Daily Usage</p>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{rec.daily_usage.toFixed(1)}</span>
                        {getTrendIcon(rec.velocity_metrics.trend)}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reorder Point</p>
                      <p className="font-medium">{rec.recommended_reorder_point}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Safety Stock</p>
                      <p className="font-medium">{rec.recommended_safety_stock}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Volatility</p>
                      <p className="font-medium">{(rec.velocity_metrics.volatility * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Recommendations:</p>
                    <ul className="space-y-1">
                      {rec.recommendations.map((recommendation, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Warnings */}
                  {rec.warnings.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-sm text-yellow-600">Warnings:</p>
                      <ul className="space-y-1">
                        {rec.warnings.map((warning, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-yellow-600">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Financial Impact */}
                  {(rec.financial_impact.cost_savings > 0 || rec.financial_impact.revenue_opportunity > 0) && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-green-50 rounded-lg">
                      {rec.financial_impact.cost_savings > 0 && (
                        <div>
                          <p className="text-xs text-green-600">Potential Cost Savings</p>
                          <p className="font-medium text-green-700">
                            {formatPrice(rec.financial_impact.cost_savings)}
                          </p>
                        </div>
                      )}
                      {rec.financial_impact.revenue_opportunity > 0 && (
                        <div>
                          <p className="text-xs text-green-600">Revenue Opportunity</p>
                          <p className="font-medium text-green-700">
                            {formatPrice(rec.financial_impact.revenue_opportunity)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {optimization.recommendations.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Good!</h3>
                  <p className="text-muted-foreground">
                    No immediate inventory optimization recommendations at this time.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ABC Classification Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {optimization.abc_analysis.a_products}
                  </div>
                  <div className="text-sm text-red-600">A-Class Products</div>
                  <div className="text-xs text-muted-foreground mt-1">High Value (80% revenue)</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {optimization.abc_analysis.b_products}
                  </div>
                  <div className="text-sm text-yellow-600">B-Class Products</div>
                  <div className="text-xs text-muted-foreground mt-1">Medium Value (15% revenue)</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {optimization.abc_analysis.c_products}
                  </div>
                  <div className="text-sm text-gray-600">C-Class Products</div>
                  <div className="text-xs text-muted-foreground mt-1">Low Value (5% revenue)</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <h4 className="font-medium">ABC Analysis Guidelines:</h4>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• <strong>A-Class:</strong> Tight inventory control, frequent reviews, high service levels</li>
                  <li>• <strong>B-Class:</strong> Moderate control, periodic reviews, good service levels</li>
                  <li>• <strong>C-Class:</strong> Simple controls, bulk ordering, acceptable stockouts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Key Insights</h4>
                <ul className="space-y-2">
                  {optimization.strategic_insights.key_insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-3">Actionable Steps</h4>
                <ul className="space-y-2">
                  {optimization.strategic_insights.actionable_steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  <strong>Next Review Date:</strong> {new Date(optimization.strategic_insights.next_review_date).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {optimization.optimization_summary.overstocked_products}
                </div>
                <div className="text-sm text-muted-foreground">Overstocked</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {optimization.optimization_summary.understocked_products}
                </div>
                <div className="text-sm text-muted-foreground">Understocked</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {optimization.optimization_summary.slow_moving_products}
                </div>
                <div className="text-sm text-muted-foreground">Slow Moving</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {optimization.optimization_summary.reorder_recommendations}
                </div>
                <div className="text-sm text-muted-foreground">Reorder Needed</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Financial Impact</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Potential Savings:</span>
                      <span className="font-medium text-green-600">
                        {formatPrice(optimization.overview.potential_savings)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue Opportunities:</span>
                      <span className="font-medium text-blue-600">
                        {formatPrice(optimization.overview.revenue_opportunities)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Analysis Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Last Analyzed:</span>
                      <span>{new Date(optimization.overview.last_analyzed).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recommendations:</span>
                      <span>{optimization.overview.recommendations_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}