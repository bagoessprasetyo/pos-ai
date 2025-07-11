import type { Product, Transaction } from '@/types'

// Business Insights Prompts
export const createBusinessInsightsPrompt = (
  salesData: {
    todaysSales: number
    todaysTransactions: number
    todaysItemsSold: number
    avgTransactionValue: number
    weekSales: number
    monthSales: number
    salesTrend: Array<{ date: string; sales: number; transactions: number }>
  },
  topProducts: Array<{
    id: string
    name: string
    sales: number
    quantity: number
  }>,
  categoryPerformance: Array<{
    name: string
    sales: number
    percentage: number
  }>
) => {
  return `You are an AI business analyst for a retail store. Analyze the following sales data and provide actionable business insights.

**Sales Performance:**
- Today's Sales: $${salesData.todaysSales}
- Today's Transactions: ${salesData.todaysTransactions}
- Items Sold Today: ${salesData.todaysItemsSold}
- Average Transaction Value: $${salesData.avgTransactionValue}
- Week Sales: $${salesData.weekSales}
- Month Sales: $${salesData.monthSales}

**Sales Trend (Last 7 days):**
${salesData.salesTrend.map(day => `${day.date}: $${day.sales} (${day.transactions} transactions)`).join('\n')}

**Top Performing Products:**
${topProducts.map(product => `${product.name}: $${product.sales} revenue, ${product.quantity} units sold`).join('\n')}

**Category Performance:**
${categoryPerformance.map(cat => `${cat.name}: $${cat.sales} (${cat.percentage}% of total sales)`).join('\n')}

Please provide 3-5 actionable business insights in JSON format with the following structure:
{
  "insights": [
    {
      "title": "Brief insight title",
      "description": "Detailed explanation of the insight",
      "type": "opportunity" | "warning" | "trend" | "optimization",
      "priority": "high" | "medium" | "low",
      "actionable_steps": ["Step 1", "Step 2", "Step 3"],
      "potential_impact": "Description of expected business impact",
      "confidence_score": 0.85
    }
  ]
}

Focus on:
1. Sales opportunities and growth areas
2. Inventory optimization suggestions
3. Customer behavior patterns
4. Revenue optimization strategies
5. Operational efficiency improvements

Be specific, actionable, and data-driven in your recommendations.`
}

// Product Recommendations Prompt
export const createRecommendationPrompt = (
  cartItems: Array<{
    id: string
    name: string
    category?: string
    price: number
    quantity: number
  }>,
  availableProducts: Array<{
    id: string
    name: string
    category?: string
    price: number
    description?: string
  }>,
  recentPurchases?: Array<{
    productName: string
    frequency: number
  }>
) => {
  const cartItemsText = cartItems.map(item => 
    `${item.name} (${item.category || 'Uncategorized'}) - $${item.price} x${item.quantity}`
  ).join('\n')

  const availableProductsText = availableProducts.slice(0, 50).map(product => 
    `${product.id}: ${product.name} (${product.category || 'Uncategorized'}) - $${product.price}`
  ).join('\n')

  const recentPurchasesText = recentPurchases?.slice(0, 20).map(purchase =>
    `${purchase.productName} (bought ${purchase.frequency} times)`
  ).join('\n') || 'No recent purchase history available'

  return `You are an AI sales assistant for a retail store. Based on the customer's current cart and available inventory, suggest complementary products that would enhance their purchase.

**Current Cart Items:**
${cartItemsText}

**Available Products (sample):**
${availableProductsText}

**Customer's Recent Purchase History:**
${recentPurchasesText}

Provide 3-5 product recommendations in JSON format:
{
  "recommendations": [
    {
      "product_id": "product_id_from_available_list",
      "product_name": "Product Name",
      "reason": "Why this product complements the cart",
      "type": "cross_sell" | "upsell" | "bundle" | "trending",
      "confidence_score": 0.85,
      "potential_value_add": "How this increases order value"
    }
  ]
}

Consider:
1. Product complementarity and synergy
2. Price points and customer budget
3. Popular product combinations
4. Seasonal relevance
5. Profit margins
6. Inventory levels

Focus on recommendations that genuinely add value to the customer's purchase and increase store revenue.`
}

// Sales Forecasting Prompt
export const createForecastingPrompt = (
  historicalData: Array<{
    date: string
    sales: number
    transactions: number
    items_sold: number
  }>,
  seasonalFactors?: {
    month: number
    day_of_week: number
    is_holiday?: boolean
    weather_condition?: string
  },
  currentTrends?: {
    recent_growth_rate: number
    top_categories: string[]
    market_conditions: string
  }
) => {
  const historicalDataText = historicalData.map(day =>
    `${day.date}: $${day.sales}, ${day.transactions} transactions, ${day.items_sold} items`
  ).join('\n')

  return `You are an AI forecasting analyst for a retail store. Analyze the historical sales data and provide sales predictions for the next 7 days.

**Historical Sales Data (Last 30 days):**
${historicalDataText}

**Current Context:**
- Month: ${seasonalFactors?.month || 'Unknown'}
- Day of Week Pattern: ${seasonalFactors?.day_of_week || 'Unknown'}
- Is Holiday Period: ${seasonalFactors?.is_holiday ? 'Yes' : 'No'}
- Weather: ${seasonalFactors?.weather_condition || 'Unknown'}

**Market Trends:**
- Recent Growth Rate: ${currentTrends?.recent_growth_rate || 0}%
- Top Categories: ${currentTrends?.top_categories?.join(', ') || 'Unknown'}
- Market Conditions: ${currentTrends?.market_conditions || 'Stable'}

Provide a 7-day sales forecast in JSON format:
{
  "forecast": [
    {
      "date": "YYYY-MM-DD",
      "predicted_sales": 1250.00,
      "predicted_transactions": 45,
      "predicted_items": 120,
      "confidence_interval": {
        "lower_bound": 1100.00,
        "upper_bound": 1400.00
      },
      "factors": ["Day of week effect", "Seasonal trend", "Weather impact"]
    }
  ],
  "summary": {
    "total_week_prediction": 8750.00,
    "average_daily_sales": 1250.00,
    "confidence_level": 0.82,
    "key_assumptions": ["List of key assumptions made"],
    "risk_factors": ["Potential risks to forecast accuracy"]
  }
}

Consider:
1. Day-of-week patterns
2. Seasonal trends and holidays
3. Historical growth rates
4. External factors (weather, events)
5. Market conditions and competition
6. Inventory constraints

Provide realistic, data-driven predictions with appropriate confidence intervals.`
}

// Inventory Alert Prompt
export const createInventoryAlertPrompt = (
  lowStockItems: Array<{
    id: string
    name: string
    current_stock: number
    reorder_point: number
    daily_sales_velocity: number
    category: string
  }>,
  salesForecast: Array<{
    date: string
    predicted_sales: number
  }>
) => {
  const lowStockText = lowStockItems.map(item =>
    `${item.name}: ${item.current_stock} units (reorder at ${item.reorder_point}), sells ${item.daily_sales_velocity} units/day`
  ).join('\n')

  return `You are an AI inventory manager. Analyze the low stock items and upcoming sales forecast to provide intelligent inventory alerts and recommendations.

**Low Stock Items:**
${lowStockText}

**7-Day Sales Forecast:**
${salesForecast.map(day => `${day.date}: $${day.predicted_sales}`).join('\n')}

Provide inventory recommendations in JSON format:
{
  "alerts": [
    {
      "product_id": "product_id",
      "product_name": "Product Name",
      "alert_type": "critical" | "warning" | "recommendation",
      "current_stock": 5,
      "days_until_stockout": 3,
      "recommended_order_quantity": 50,
      "urgency_level": "high" | "medium" | "low",
      "reasoning": "Why this action is needed",
      "cost_impact": "Estimated cost of stockout vs reorder cost"
    }
  ],
  "summary": {
    "total_items_at_risk": 5,
    "critical_items": 2,
    "estimated_lost_sales": 1500.00,
    "recommended_immediate_actions": ["Action 1", "Action 2"]
  }
}

Consider:
1. Sales velocity and forecast demand
2. Lead times for reordering
3. Seasonal fluctuations
4. Cost of stockouts vs carrying costs
5. Supplier reliability
6. Cash flow implications

Prioritize recommendations by business impact and urgency.`
}

// Trend Analysis Prompt
export const createTrendAnalysisPrompt = (
  salesData: Array<{
    date: string
    sales: number
    category_breakdown: Record<string, number>
  }>,
  externalFactors?: {
    season: string
    local_events: string[]
    economic_indicators: string
  }
) => {
  return `You are an AI trend analyst. Analyze the sales data to identify patterns, trends, and opportunities.

**Sales Data Analysis Period:**
${salesData.map(day => 
  `${day.date}: $${day.sales} total (${Object.entries(day.category_breakdown).map(([cat, sales]) => `${cat}: $${sales}`).join(', ')})`
).join('\n')}

**External Context:**
- Season: ${externalFactors?.season || 'Unknown'}
- Local Events: ${externalFactors?.local_events?.join(', ') || 'None'}
- Economic Climate: ${externalFactors?.economic_indicators || 'Stable'}

Identify trends and provide analysis in JSON format:
{
  "trends": [
    {
      "trend_name": "Trend Name",
      "trend_type": "growth" | "decline" | "seasonal" | "cyclical",
      "confidence": 0.85,
      "time_period": "Duration of trend",
      "description": "Detailed trend description",
      "business_impact": "How this affects the business",
      "recommended_actions": ["Action 1", "Action 2"]
    }
  ],
  "opportunities": [
    {
      "opportunity": "Market opportunity description",
      "potential_value": "Estimated value/impact",
      "action_required": "What needs to be done",
      "timeline": "When to act"
    }
  ]
}

Focus on actionable insights that can drive business decisions.`
}

// Prompt validation and sanitization
export function sanitizePromptData(data: any): any {
  // Remove sensitive information and validate data structure
  if (typeof data !== 'object' || data === null) {
    return {}
  }

  // Deep clone and sanitize
  const sanitized = JSON.parse(JSON.stringify(data))
  
  // Remove any potential sensitive fields
  const sensitiveFields = ['api_key', 'password', 'secret', 'token', 'credit_card']
  
  function removeSensitiveFields(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj
    
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        delete obj[key]
      } else if (typeof obj[key] === 'object') {
        obj[key] = removeSensitiveFields(obj[key])
      }
    }
    
    return obj
  }

  return removeSensitiveFields(sanitized)
}

// Helper function to truncate data for token limits
export function truncateDataForPrompt(data: any[], maxItems: number = 100): any[] {
  if (!Array.isArray(data)) return []
  return data.slice(0, maxItems)
}