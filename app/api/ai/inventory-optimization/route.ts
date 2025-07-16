import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { store_id } = await request.json()

    if (!store_id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    // Get comprehensive inventory and sales data
    const [inventoryData, salesData, productData] = await Promise.all([
      getInventoryData(supabase, store_id),
      getSalesHistory(supabase, store_id),
      getProductData(supabase, store_id)
    ])

    // Generate inventory optimization recommendations
    const optimizationResults = await generateInventoryOptimization({
      inventory: inventoryData,
      sales: salesData,
      products: productData,
      store_id
    })

    return NextResponse.json(optimizationResults)

  } catch (error) {
    console.error('Inventory optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to generate inventory optimization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getInventoryData(supabase: any, store_id: string) {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      product:products(
        id,
        name,
        sku,
        price,
        cost,
        category_id,
        category:categories(name)
      )
    `)
    .eq('store_id', store_id)

  if (error) throw error
  return data || []
}

async function getSalesHistory(supabase: any, store_id: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('transaction_items')
    .select(`
      *,
      transaction:transactions!inner(
        id,
        created_at,
        status,
        store_id
      ),
      product:products(
        id,
        name,
        sku,
        price,
        cost
      )
    `)
    .eq('transaction.store_id', store_id)
    .eq('transaction.status', 'completed')
    .gte('transaction.created_at', thirtyDaysAgo.toISOString())

  if (error) throw error
  return data || []
}

async function getProductData(supabase: any, store_id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(name),
      inventory(quantity, reorder_point, reorder_quantity)
    `)
    .eq('store_id', store_id)
    .eq('is_active', true)

  if (error) throw error
  return data || []
}

interface OptimizationInput {
  inventory: any[]
  sales: any[]
  products: any[]
  store_id: string
}

async function generateInventoryOptimization({ inventory, sales, products }: OptimizationInput) {
  const currentDate = new Date()
  const recommendations: any[] = []
  const insights: any = {
    total_products: products.length,
    products_analyzed: 0,
    high_priority_actions: 0,
    potential_savings: 0,
    revenue_opportunities: 0
  }

  // Calculate sales velocity for each product
  const salesVelocity = calculateSalesVelocity(sales)
  
  // Calculate ABC classification
  const abcClassification = calculateABCClassification(sales, products)
  
  // Calculate seasonality patterns
  const seasonalityPatterns = calculateSeasonalityPatterns(sales)
  
  // Calculate lead times and safety stock requirements
  const leadTimeAnalysis = calculateLeadTimeRequirements(sales)

  // Generate recommendations for each product
  for (const product of products) {
    const productId = product.id
    const currentInventory = inventory.find(inv => inv.product_id === productId)
    const velocity = salesVelocity[productId] || { daily_average: 0, trend: 'stable', volatility: 0 }
    const classification = abcClassification[productId] || 'C'
    const seasonality = seasonalityPatterns[productId] || { seasonal_factor: 1, peak_months: [] }
    const leadTime = leadTimeAnalysis[productId] || { recommended_safety_stock: 0, reorder_point: 0 }

    if (currentInventory) {
      insights.products_analyzed++

      const analysis = analyzeProductInventory({
        product,
        currentInventory,
        velocity,
        classification,
        seasonality,
        leadTime
      })

      if (analysis && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0) {
        recommendations.push(analysis)
        
        if (analysis.priority === 'high') {
          insights.high_priority_actions++
        }
        
        insights.potential_savings += analysis.financial_impact.cost_savings || 0
        insights.revenue_opportunities += analysis.financial_impact.revenue_opportunity || 0
      }
    }
  }

  // Sort recommendations by priority and financial impact
  recommendations.sort((a, b) => {
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }
    
    const aImpact = (a.financial_impact.cost_savings || 0) + (a.financial_impact.revenue_opportunity || 0)
    const bImpact = (b.financial_impact.cost_savings || 0) + (b.financial_impact.revenue_opportunity || 0)
    
    return bImpact - aImpact
  })

  // Generate overall inventory health score
  const healthScore = calculateInventoryHealthScore(recommendations, insights)

  // Generate strategic insights
  const strategicInsights = generateStrategicInsights(recommendations, abcClassification, seasonalityPatterns)

  return {
    overview: {
      ...insights,
      health_score: healthScore,
      last_analyzed: currentDate.toISOString(),
      recommendations_count: recommendations.length
    },
    recommendations: recommendations.slice(0, 50), // Limit to top 50 recommendations
    strategic_insights: strategicInsights,
    abc_analysis: {
      a_products: Object.values(abcClassification).filter(c => c === 'A').length,
      b_products: Object.values(abcClassification).filter(c => c === 'B').length,
      c_products: Object.values(abcClassification).filter(c => c === 'C').length
    },
    optimization_summary: {
      overstocked_products: recommendations.filter(r => r.issue_type === 'overstock').length,
      understocked_products: recommendations.filter(r => r.issue_type === 'understock').length,
      slow_moving_products: recommendations.filter(r => r.issue_type === 'slow_moving').length,
      reorder_recommendations: recommendations.filter(r => r.issue_type === 'reorder_needed').length
    }
  }
}

function calculateSalesVelocity(sales: any[]) {
  const velocity: { [productId: string]: any } = {}
  const productSales: { [productId: string]: { date: string, quantity: number }[] } = {}

  // Group sales by product
  sales.forEach(sale => {
    const productId = sale.product_id
    const date = new Date(sale.transaction.created_at).toISOString().split('T')[0]
    
    if (!productSales[productId]) {
      productSales[productId] = []
    }
    
    productSales[productId].push({
      date,
      quantity: sale.quantity
    })
  })

  // Calculate velocity metrics for each product
  Object.entries(productSales).forEach(([productId, productSalesData]) => {
    const totalQuantity = productSalesData.reduce((sum, sale) => sum + sale.quantity, 0)
    const totalDays = Math.max(1, (new Date().getTime() - new Date(Math.min(...productSalesData.map(s => new Date(s.date).getTime()))).getTime()) / (1000 * 60 * 60 * 24))
    
    const dailyAverage = totalQuantity / totalDays
    
    // Calculate trend (simple linear regression)
    const recentSales = productSalesData.slice(-14) // Last 14 days
    const trend = recentSales.length > 7 ? calculateTrend(recentSales) : 'stable'
    
    // Calculate volatility (coefficient of variation)
    const dailySales: { [date: string]: number } = {}
    productSalesData.forEach(sale => {
      dailySales[sale.date] = (dailySales[sale.date] || 0) + sale.quantity
    })
    
    const dailyValues = Object.values(dailySales)
    const mean = dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length
    const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyValues.length
    const volatility = mean > 0 ? Math.sqrt(variance) / mean : 0
    
    velocity[productId] = {
      daily_average: dailyAverage,
      trend,
      volatility,
      total_sold: totalQuantity,
      days_tracked: totalDays
    }
  })

  return velocity
}

function calculateTrend(salesData: { date: string, quantity: number }[]): string {
  if (salesData.length < 3) return 'stable'
  
  const x = salesData.map((_, index) => index)
  const y = salesData.map(sale => sale.quantity)
  
  const n = salesData.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  
  if (slope > 0.1) return 'increasing'
  if (slope < -0.1) return 'decreasing'
  return 'stable'
}

function calculateABCClassification(sales: any[], products: any[]) {
  const productRevenue: { [productId: string]: number } = {}
  
  // Calculate total revenue per product
  sales.forEach(sale => {
    const productId = sale.product_id
    const revenue = sale.line_total
    productRevenue[productId] = (productRevenue[productId] || 0) + revenue
  })
  
  // Sort products by revenue
  const sortedProducts = Object.entries(productRevenue)
    .sort(([, a], [, b]) => b - a)
  
  const totalRevenue = Object.values(productRevenue).reduce((sum, rev) => sum + rev, 0)
  
  const classification: { [productId: string]: string } = {}
  let cumulativeRevenue = 0
  
  sortedProducts.forEach(([productId, revenue]) => {
    cumulativeRevenue += revenue
    const cumulativePercentage = cumulativeRevenue / totalRevenue
    
    if (cumulativePercentage <= 0.8) {
      classification[productId] = 'A'
    } else if (cumulativePercentage <= 0.95) {
      classification[productId] = 'B'
    } else {
      classification[productId] = 'C'
    }
  })
  
  return classification
}

function calculateSeasonalityPatterns(sales: any[]) {
  const patterns: { [productId: string]: any } = {}
  const monthlyData: { [productId: string]: { [month: number]: number } } = {}
  
  // Group sales by product and month
  sales.forEach(sale => {
    const productId = sale.product_id
    const month = new Date(sale.transaction.created_at).getMonth()
    
    if (!monthlyData[productId]) {
      monthlyData[productId] = {}
    }
    
    monthlyData[productId][month] = (monthlyData[productId][month] || 0) + sale.quantity
  })
  
  // Calculate seasonal patterns
  Object.entries(monthlyData).forEach(([productId, monthData]) => {
    const months = Object.keys(monthData).map(Number)
    const quantities = Object.values(monthData)
    const avgQuantity = quantities.reduce((sum, q) => sum + q, 0) / quantities.length
    
    // Find peak months (above average)
    const peakMonths = months.filter(month => monthData[month] > avgQuantity * 1.2)
    
    // Calculate seasonal factor
    const maxQuantity = Math.max(...quantities)
    const minQuantity = Math.min(...quantities)
    const seasonalFactor = avgQuantity > 0 ? (maxQuantity - minQuantity) / avgQuantity : 0
    
    patterns[productId] = {
      seasonal_factor: seasonalFactor,
      peak_months: peakMonths,
      average_monthly_sales: avgQuantity
    }
  })
  
  return patterns
}

function calculateLeadTimeRequirements(sales: any[]) {
  const requirements: { [productId: string]: any } = {}
  
  // For now, use simplified calculations
  // In a real system, this would incorporate supplier lead times and service level requirements
  
  Object.keys(calculateSalesVelocity(sales)).forEach(productId => {
    const velocity = calculateSalesVelocity(sales)[productId]
    
    // Assume 7-day lead time and 95% service level
    const leadTimeDays = 7
    const serviceLevel = 0.95
    const safetyFactor = 1.65 // For 95% service level (z-score)
    
    const leadTimeDemand = velocity.daily_average * leadTimeDays
    const safetyStock = safetyFactor * Math.sqrt(leadTimeDays) * velocity.daily_average * velocity.volatility
    
    requirements[productId] = {
      recommended_safety_stock: Math.ceil(safetyStock),
      reorder_point: Math.ceil(leadTimeDemand + safetyStock),
      lead_time_days: leadTimeDays
    }
  })
  
  return requirements
}

function analyzeProductInventory({ product, currentInventory, velocity, classification, seasonality, leadTime }: any) {
  const recommendations: string[] = []
  const warnings: string[] = []
  let priority: string = 'low'
  let issueType: string = 'none'
  
  const currentStock = currentInventory.quantity
  const reorderPoint = currentInventory.reorder_point || leadTime.reorder_point
  const dailyUsage = velocity.daily_average
  
  let financialImpact = {
    cost_savings: 0,
    revenue_opportunity: 0,
    carrying_cost_reduction: 0
  }
  
  // Check for stockout risk
  if (currentStock <= reorderPoint && dailyUsage > 0) {
    const daysUntilStockout = currentStock / dailyUsage
    
    if (daysUntilStockout <= 3) {
      recommendations.push(`Critical: Reorder immediately - only ${daysUntilStockout.toFixed(1)} days of stock remaining`)
      priority = 'critical'
      issueType = 'stockout_risk'
      financialImpact.revenue_opportunity = dailyUsage * product.price * 7 // Lost sales for a week
    } else if (daysUntilStockout <= 7) {
      recommendations.push(`Reorder needed - ${daysUntilStockout.toFixed(1)} days of stock remaining`)
      priority = priority === 'low' ? 'high' : priority
      issueType = 'reorder_needed'
    }
  }
  
  // Check for overstock
  if (dailyUsage > 0) {
    const daysOfStock = currentStock / dailyUsage
    
    if (daysOfStock > 90) {
      recommendations.push(`Overstocked: ${daysOfStock.toFixed(0)} days of inventory. Consider promotions or reducing orders.`)
      priority = priority === 'low' ? 'medium' : priority
      issueType = 'overstock'
      financialImpact.carrying_cost_reduction = (currentStock - dailyUsage * 45) * product.cost * 0.02 // 2% monthly carrying cost
    }
  }
  
  // Check for slow-moving inventory
  if (velocity.trend === 'decreasing' && dailyUsage < 0.1) {
    recommendations.push('Slow-moving item: Consider promotions, bundling, or discontinuation')
    warnings.push('Sales trend is declining')
    priority = priority === 'low' ? 'medium' : priority
    issueType = 'slow_moving'
  }
  
  // Seasonal adjustments
  const currentMonth = new Date().getMonth()
  if (seasonality.peak_months.includes(currentMonth) && velocity.trend !== 'increasing') {
    recommendations.push('Peak season approaching: Consider increasing stock levels')
    priority = priority === 'low' ? 'medium' : priority
  }
  
  // ABC classification insights
  if (classification === 'A' && currentStock <= reorderPoint) {
    recommendations.push('High-value product requires immediate attention')
    priority = 'high'
  }
  
  // Optimize reorder point and quantity
  if (Math.abs(reorderPoint - leadTime.reorder_point) > leadTime.reorder_point * 0.2) {
    recommendations.push(`Update reorder point from ${reorderPoint} to ${leadTime.reorder_point} based on current sales velocity`)
  }
  
  if (recommendations.length === 0) {
    return null // No recommendations needed
  }
  
  return {
    product_id: product.id,
    product_name: product.name,
    sku: product.sku,
    category: product.category?.name || 'Uncategorized',
    current_stock: currentStock,
    recommended_reorder_point: leadTime.reorder_point,
    recommended_safety_stock: leadTime.recommended_safety_stock,
    daily_usage: dailyUsage,
    abc_classification: classification,
    priority,
    issue_type: issueType,
    recommendations,
    warnings,
    financial_impact: financialImpact,
    velocity_metrics: velocity,
    seasonality_info: seasonality
  }
}

function calculateInventoryHealthScore(recommendations: any[], insights: any): number {
  const totalProducts = insights.products_analyzed
  const criticalIssues = recommendations.filter(r => r.priority === 'critical').length
  const highIssues = recommendations.filter(r => r.priority === 'high').length
  const mediumIssues = recommendations.filter(r => r.priority === 'medium').length
  
  if (totalProducts === 0) return 50 // Neutral score if no data
  
  // Start with 100 and deduct points for issues
  let score = 100
  score -= (criticalIssues / totalProducts) * 40 // Critical issues heavily penalized
  score -= (highIssues / totalProducts) * 20    // High issues moderately penalized
  score -= (mediumIssues / totalProducts) * 10  // Medium issues lightly penalized
  
  return Math.max(0, Math.min(100, Math.round(score)))
}

function generateStrategicInsights(recommendations: any[], abcClassification: any, seasonalityPatterns: any) {
  const insights: string[] = []
  const actionableSteps: string[] = []
  
  // ABC Analysis insights
  const aProducts = Object.values(abcClassification).filter(c => c === 'A').length
  const totalProducts = Object.keys(abcClassification).length
  
  if (aProducts / totalProducts > 0.3) {
    insights.push('High concentration of A-class products requires focused inventory management')
    actionableSteps.push('Implement daily monitoring for top 20% revenue-generating products')
  }
  
  // Seasonality insights
  const seasonalProducts = Object.values(seasonalityPatterns).filter((p: any) => p.seasonal_factor > 0.5).length
  
  if (seasonalProducts > totalProducts * 0.2) {
    insights.push('Significant seasonal patterns detected - consider seasonal forecasting models')
    actionableSteps.push('Develop season-specific inventory plans for high-variation products')
  }
  
  // Issue pattern analysis
  const criticalCount = recommendations.filter(r => r.priority === 'critical').length
  const overstockCount = recommendations.filter(r => r.issue_type === 'overstock').length
  
  if (criticalCount > 5) {
    insights.push('Multiple critical stockout risks detected - review supplier relationships and lead times')
    actionableSteps.push('Establish backup suppliers for critical products')
  }
  
  if (overstockCount > totalProducts * 0.15) {
    insights.push('High overstock levels suggest opportunity to optimize order quantities')
    actionableSteps.push('Review and reduce order quantities for slow-moving products')
  }
  
  return {
    key_insights: insights,
    actionable_steps: actionableSteps,
    next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
  }
}