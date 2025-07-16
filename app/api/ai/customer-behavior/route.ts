import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAICompletion, isAIEnabled } from '@/lib/ai/openai-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { store_id, analysis_type = 'comprehensive' } = await request.json()

    if (!store_id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    // Get comprehensive customer and transaction data
    const [customerData, transactionData, productData] = await Promise.all([
      getCustomerData(supabase, store_id),
      getTransactionHistory(supabase, store_id),
      getProductPurchaseData(supabase, store_id)
    ])

    // Generate behavioral analysis
    const behaviorAnalysis = await generateCustomerBehaviorAnalysis({
      customers: customerData,
      transactions: transactionData,
      products: productData,
      store_id,
      analysis_type
    })

    return NextResponse.json(behaviorAnalysis)

  } catch (error) {
    console.error('Customer behavior analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze customer behavior', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getCustomerData(supabase: any, store_id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', store_id)

  if (error) throw error
  return data || []
}

async function getTransactionHistory(supabase: any, store_id: string) {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone),
      transaction_items(
        *,
        product:products(id, name, category_id, price, cost)
      )
    `)
    .eq('store_id', store_id)
    .eq('status', 'completed')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function getProductPurchaseData(supabase: any, store_id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(name)
    `)
    .eq('store_id', store_id)
    .eq('is_active', true)

  if (error) throw error
  return data || []
}

interface BehaviorAnalysisInput {
  customers: any[]
  transactions: any[]
  products: any[]
  store_id: string
  analysis_type: string
}

async function generateCustomerBehaviorAnalysis({ customers, transactions, products, analysis_type }: BehaviorAnalysisInput) {
  // Perform statistical analysis first
  const customerSegments = performCustomerSegmentation(customers, transactions)
  const purchasePatterns = analyzePurchasePatterns(transactions)
  const loyaltyMetrics = calculateLoyaltyMetrics(customers, transactions)
  const churnAnalysis = performChurnAnalysis(customers, transactions)
  const preferenceAnalysis = analyzeProductPreferences(transactions, products)
  const behavioralTrends = analyzeBehavioralTrends(transactions)
  const lifetimeValueAnalysis = calculateCustomerLifetimeValue(customers, transactions)

  // Generate AI insights if enabled
  let aiInsights = null
  if (isAIEnabled()) {
    try {
      const prompt = generateCustomerAnalysisPrompt({
        customerSegments,
        purchasePatterns,
        loyaltyMetrics,
        churnAnalysis,
        preferenceAnalysis,
        behavioralTrends,
        lifetimeValueAnalysis,
        analysis_type
      })

      const completion = await generateAICompletion([
        { role: 'system', content: 'You are a customer behavior analysis expert specializing in retail analytics and marketing strategy.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        maxTokens: 2000
      })

      aiInsights = JSON.parse(completion)
    } catch (error) {
      console.warn('AI insights generation failed:', error)
      aiInsights = generateFallbackInsights(customerSegments, purchasePatterns, churnAnalysis)
    }
  } else {
    aiInsights = generateFallbackInsights(customerSegments, purchasePatterns, churnAnalysis)
  }

  return {
    overview: {
      total_customers: customers.length,
      active_customers: customers.filter(c => c.last_visit && new Date(c.last_visit) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)).length,
      analysis_period: '6 months',
      segments_identified: Object.keys(customerSegments).length,
      last_analyzed: new Date().toISOString()
    },
    customer_segments: customerSegments,
    purchase_patterns: purchasePatterns,
    loyalty_metrics: loyaltyMetrics,
    churn_analysis: churnAnalysis,
    product_preferences: preferenceAnalysis,
    behavioral_trends: behavioralTrends,
    lifetime_value: lifetimeValueAnalysis,
    ai_insights: aiInsights
  }
}

function performCustomerSegmentation(customers: any[], transactions: any[]) {
  const segments: { [key: string]: any } = {}
  
  // Calculate RFM scores for each customer
  const customerMetrics: { [customerId: string]: any } = {}
  
  customers.forEach(customer => {
    const customerTransactions = transactions.filter(t => t.customer_id === customer.id)
    
    if (customerTransactions.length === 0) {
      customerMetrics[customer.id] = {
        customer,
        recency: 365, // days since last purchase
        frequency: 0,
        monetary: 0,
        rfm_score: 111
      }
      return
    }

    // Recency: days since last purchase
    const lastPurchase = new Date(Math.max(...customerTransactions.map(t => new Date(t.created_at).getTime())))
    const recency = Math.floor((new Date().getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
    
    // Frequency: number of transactions
    const frequency = customerTransactions.length
    
    // Monetary: total spent
    const monetary = customerTransactions.reduce((sum, t) => sum + t.total, 0)
    
    customerMetrics[customer.id] = {
      customer,
      recency,
      frequency,
      monetary,
      transactions: customerTransactions
    }
  })

  // Calculate RFM quintiles
  const allMetrics = Object.values(customerMetrics)
  const recencyQuintiles = calculateQuintiles(allMetrics.map(m => m.recency).sort((a, b) => a - b)) // Lower is better
  const frequencyQuintiles = calculateQuintiles(allMetrics.map(m => m.frequency).sort((a, b) => b - a)) // Higher is better
  const monetaryQuintiles = calculateQuintiles(allMetrics.map(m => m.monetary).sort((a, b) => b - a)) // Higher is better

  // Assign RFM scores
  Object.values(customerMetrics).forEach((metrics: any) => {
    const rScore = 6 - getQuintileScore(metrics.recency, recencyQuintiles) // Invert for recency
    const fScore = getQuintileScore(metrics.frequency, frequencyQuintiles)
    const mScore = getQuintileScore(metrics.monetary, monetaryQuintiles)
    
    metrics.rfm_score = parseInt(`${rScore}${fScore}${mScore}`)
    metrics.r_score = rScore
    metrics.f_score = fScore
    metrics.m_score = mScore
  })

  // Create segments based on RFM scores
  segments.champions = {
    name: 'Champions',
    description: 'Best customers - high value, frequent, recent purchases',
    customers: Object.values(customerMetrics).filter((m: any) => 
      m.r_score >= 4 && m.f_score >= 4 && m.m_score >= 4
    ),
    characteristics: ['High frequency', 'High monetary value', 'Recent purchases'],
    recommendations: ['Reward loyalty', 'Ask for reviews', 'Upsell premium products']
  }

  segments.loyal_customers = {
    name: 'Loyal Customers',
    description: 'Regular customers with good value',
    customers: Object.values(customerMetrics).filter((m: any) => 
      m.r_score >= 3 && m.f_score >= 3 && m.m_score >= 3 && 
      !(m.r_score >= 4 && m.f_score >= 4 && m.m_score >= 4)
    ),
    characteristics: ['Consistent purchases', 'Good value', 'Reliable'],
    recommendations: ['Membership programs', 'Cross-sell', 'Increase purchase frequency']
  }

  segments.potential_loyalists = {
    name: 'Potential Loyalists',
    description: 'Recent customers with potential',
    customers: Object.values(customerMetrics).filter((m: any) => 
      m.r_score >= 3 && m.f_score <= 2 && m.m_score >= 3
    ),
    characteristics: ['Recent purchases', 'Low frequency', 'Good value per transaction'],
    recommendations: ['Onboarding campaigns', 'Product education', 'Frequency incentives']
  }

  segments.new_customers = {
    name: 'New Customers',
    description: 'Recent first-time buyers',
    customers: Object.values(customerMetrics).filter((m: any) => 
      m.r_score >= 4 && m.f_score === 1
    ),
    characteristics: ['Very recent first purchase', 'Unknown potential'],
    recommendations: ['Welcome series', 'Product recommendations', 'Support onboarding']
  }

  segments.at_risk = {
    name: 'At Risk',
    description: 'Good customers who haven\'t purchased recently',
    customers: Object.values(customerMetrics).filter((m: any) => 
      m.r_score <= 2 && m.f_score >= 3 && m.m_score >= 3
    ),
    characteristics: ['Was valuable', 'Declining frequency', 'Need attention'],
    recommendations: ['Win-back campaigns', 'Surveys', 'Special offers']
  }

  segments.cannot_lose = {
    name: 'Cannot Lose Them',
    description: 'High-value customers at risk of churning',
    customers: Object.values(customerMetrics).filter((m: any) => 
      m.r_score <= 2 && m.f_score >= 4 && m.m_score >= 4
    ),
    characteristics: ['High historical value', 'At risk of leaving'],
    recommendations: ['Immediate attention', 'Personal outreach', 'Exclusive offers']
  }

  segments.hibernating = {
    name: 'Hibernating',
    description: 'Customers who haven\'t purchased in a long time',
    customers: Object.values(customerMetrics).filter((m: any) => 
      m.r_score <= 2 && m.f_score <= 2 && m.m_score >= 2
    ),
    characteristics: ['Long time since purchase', 'Low recent activity'],
    recommendations: ['Reactivation campaigns', 'Product updates', 'Significant incentives']
  }

  segments.lost = {
    name: 'Lost',
    description: 'Customers who likely won\'t return',
    customers: Object.values(customerMetrics).filter((m: any) => 
      m.r_score <= 2 && m.f_score <= 2 && m.m_score <= 2
    ),
    characteristics: ['Very low engagement', 'Low value', 'Minimal activity'],
    recommendations: ['Minimal investment', 'Last-chance offers', 'Unsubscribe options']
  }

  return segments
}

function calculateQuintiles(sortedValues: number[]) {
  const n = sortedValues.length
  return {
    q1: sortedValues[Math.floor(n * 0.2)],
    q2: sortedValues[Math.floor(n * 0.4)],
    q3: sortedValues[Math.floor(n * 0.6)],
    q4: sortedValues[Math.floor(n * 0.8)]
  }
}

function getQuintileScore(value: number, quintiles: any): number {
  if (value <= quintiles.q1) return 1
  if (value <= quintiles.q2) return 2
  if (value <= quintiles.q3) return 3
  if (value <= quintiles.q4) return 4
  return 5
}

function analyzePurchasePatterns(transactions: any[]) {
  const patterns: any = {
    hourly_distribution: {},
    daily_distribution: {},
    monthly_distribution: {},
    seasonal_patterns: {},
    purchase_frequency: {},
    basket_analysis: {}
  }

  // Analyze timing patterns
  transactions.forEach(transaction => {
    const date = new Date(transaction.created_at)
    const hour = date.getHours()
    const dayOfWeek = date.getDay()
    const month = date.getMonth()
    const season = getSeason(month)

    patterns.hourly_distribution[hour] = (patterns.hourly_distribution[hour] || 0) + 1
    patterns.daily_distribution[dayOfWeek] = (patterns.daily_distribution[dayOfWeek] || 0) + 1
    patterns.monthly_distribution[month] = (patterns.monthly_distribution[month] || 0) + 1
    patterns.seasonal_patterns[season] = (patterns.seasonal_patterns[season] || 0) + 1
  })

  // Convert to percentages and insights
  const totalTransactions = transactions.length
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  patterns.peak_hour = Object.entries(patterns.hourly_distribution)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '12'
  
  patterns.peak_day = dayNames[parseInt(Object.entries(patterns.daily_distribution)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '0')]
  
  patterns.peak_month = monthNames[parseInt(Object.entries(patterns.monthly_distribution)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '0')]

  // Calculate average basket size
  patterns.average_basket_size = transactions.reduce((sum, t) => {
    const itemCount = t.transaction_items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0
    return sum + itemCount
  }, 0) / totalTransactions

  patterns.average_basket_value = transactions.reduce((sum, t) => sum + t.total, 0) / totalTransactions

  return patterns
}

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}

function calculateLoyaltyMetrics(customers: any[], transactions: any[]) {
  const metrics: any = {
    repeat_purchase_rate: 0,
    customer_retention_rate: 0,
    average_purchase_frequency: 0,
    loyalty_distribution: {}
  }

  const customersWithPurchases = customers.filter(c => 
    transactions.some(t => t.customer_id === c.id)
  )

  const repeatCustomers = customersWithPurchases.filter(c => 
    transactions.filter(t => t.customer_id === c.id).length > 1
  )

  metrics.repeat_purchase_rate = customersWithPurchases.length > 0 
    ? (repeatCustomers.length / customersWithPurchases.length) * 100 
    : 0

  // Calculate retention (customers who made purchases in multiple months)
  const customerMonthlyActivity: { [customerId: string]: Set<string> } = {}
  
  transactions.forEach(t => {
    if (t.customer_id) {
      const month = new Date(t.created_at).toISOString().substring(0, 7)
      if (!customerMonthlyActivity[t.customer_id]) {
        customerMonthlyActivity[t.customer_id] = new Set()
      }
      customerMonthlyActivity[t.customer_id].add(month)
    }
  })

  const retainedCustomers = Object.values(customerMonthlyActivity).filter(months => months.size > 1).length
  metrics.customer_retention_rate = customersWithPurchases.length > 0 
    ? (retainedCustomers / customersWithPurchases.length) * 100 
    : 0

  // Average purchase frequency
  const totalPurchases = transactions.length
  metrics.average_purchase_frequency = customersWithPurchases.length > 0 
    ? totalPurchases / customersWithPurchases.length 
    : 0

  return metrics
}

function performChurnAnalysis(customers: any[], transactions: any[]) {
  const currentDate = new Date()
  const churnThresholdDays = 90 // Consider churned if no purchase in 90 days
  
  const analysis: any = {
    total_customers: customers.length,
    active_customers: 0,
    at_risk_customers: 0,
    churned_customers: 0,
    churn_rate: 0,
    risk_factors: [],
    retention_recommendations: []
  }

  customers.forEach(customer => {
    const customerTransactions = transactions.filter(t => t.customer_id === customer.id)
    
    if (customerTransactions.length === 0) {
      analysis.churned_customers++
      return
    }

    const lastPurchase = new Date(Math.max(...customerTransactions.map(t => new Date(t.created_at).getTime())))
    const daysSinceLastPurchase = Math.floor((currentDate.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceLastPurchase > churnThresholdDays) {
      analysis.churned_customers++
    } else if (daysSinceLastPurchase > churnThresholdDays * 0.6) {
      analysis.at_risk_customers++
    } else {
      analysis.active_customers++
    }
  })

  analysis.churn_rate = customers.length > 0 ? (analysis.churned_customers / customers.length) * 100 : 0

  // Generate insights based on churn analysis
  if (analysis.churn_rate > 30) {
    analysis.risk_factors.push('High churn rate indicates customer satisfaction issues')
    analysis.retention_recommendations.push('Implement customer feedback surveys')
    analysis.retention_recommendations.push('Review product quality and service standards')
  }

  if (analysis.at_risk_customers > analysis.active_customers * 0.2) {
    analysis.risk_factors.push('Large number of customers at risk of churning')
    analysis.retention_recommendations.push('Launch targeted retention campaigns')
    analysis.retention_recommendations.push('Implement personalized outreach programs')
  }

  return analysis
}

function analyzeProductPreferences(transactions: any[], products: any[]) {
  const preferences: any = {
    category_preferences: {},
    product_affinity: {},
    cross_sell_opportunities: []
  }

  // Analyze category preferences by customer segments
  const categoryPurchases: { [categoryId: string]: number } = {}
  const productPurchases: { [productId: string]: number } = {}

  transactions.forEach(transaction => {
    transaction.transaction_items?.forEach((item: any) => {
      const product = products.find(p => p.id === item.product_id)
      if (product) {
        categoryPurchases[product.category_id] = (categoryPurchases[product.category_id] || 0) + item.quantity
        productPurchases[product.id] = (productPurchases[product.id] || 0) + item.quantity
      }
    })
  })

  // Find product affinities (products bought together)
  const productPairs: { [key: string]: number } = {}
  
  transactions.forEach(transaction => {
    const items = transaction.transaction_items || []
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const pair = [items[i].product_id, items[j].product_id].sort().join('-')
        productPairs[pair] = (productPairs[pair] || 0) + 1
      }
    }
  })

  // Convert to actionable insights
  preferences.top_categories = Object.entries(categoryPurchases)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([categoryId, count]) => {
      const category = products.find(p => p.category_id === categoryId)?.category?.name || 'Unknown'
      return { category, purchases: count }
    })

  preferences.product_affinities = Object.entries(productPairs)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([pair, count]) => {
      const [productId1, productId2] = pair.split('-')
      const product1 = products.find(p => p.id === productId1)?.name || 'Unknown'
      const product2 = products.find(p => p.id === productId2)?.name || 'Unknown'
      return { product1, product2, frequency: count }
    })

  return preferences
}

function analyzeBehavioralTrends(transactions: any[]) {
  const trends: any = {
    monthly_trends: {},
    seasonal_behavior: {},
    spending_patterns: {}
  }

  // Group transactions by month
  const monthlyData: { [month: string]: any[] } = {}
  
  transactions.forEach(transaction => {
    const month = new Date(transaction.created_at).toISOString().substring(0, 7)
    if (!monthlyData[month]) {
      monthlyData[month] = []
    }
    monthlyData[month].push(transaction)
  })

  // Calculate monthly metrics
  Object.entries(monthlyData).forEach(([month, monthTransactions]) => {
    trends.monthly_trends[month] = {
      transaction_count: monthTransactions.length,
      total_revenue: monthTransactions.reduce((sum, t) => sum + t.total, 0),
      average_basket_value: monthTransactions.reduce((sum, t) => sum + t.total, 0) / monthTransactions.length,
      unique_customers: new Set(monthTransactions.map(t => t.customer_id).filter(Boolean)).size
    }
  })

  // Calculate growth rates
  const months = Object.keys(trends.monthly_trends).sort()
  if (months.length >= 2) {
    const currentMonth = trends.monthly_trends[months[months.length - 1]]
    const previousMonth = trends.monthly_trends[months[months.length - 2]]
    
    trends.month_over_month_growth = {
      revenue: ((currentMonth.total_revenue - previousMonth.total_revenue) / previousMonth.total_revenue) * 100,
      transactions: ((currentMonth.transaction_count - previousMonth.transaction_count) / previousMonth.transaction_count) * 100,
      customers: ((currentMonth.unique_customers - previousMonth.unique_customers) / previousMonth.unique_customers) * 100
    }
  }

  return trends
}

function calculateCustomerLifetimeValue(customers: any[], transactions: any[]) {
  const clv: any = {
    average_clv: 0,
    clv_distribution: {},
    high_value_customers: [],
    clv_segments: {}
  }

  const customerValues: { [customerId: string]: number } = {}
  
  customers.forEach(customer => {
    const customerTransactions = transactions.filter(t => t.customer_id === customer.id)
    const totalValue = customerTransactions.reduce((sum, t) => sum + t.total, 0)
    customerValues[customer.id] = totalValue
  })

  const values = Object.values(customerValues)
  clv.average_clv = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0

  // Segment customers by CLV
  const sortedCustomers = Object.entries(customerValues)
    .sort(([,a], [,b]) => (b as number) - (a as number))

  const totalCustomers = sortedCustomers.length
  const topTenPercent = Math.floor(totalCustomers * 0.1)
  const topTwentyPercent = Math.floor(totalCustomers * 0.2)

  clv.high_value_customers = sortedCustomers.slice(0, topTenPercent).map(([customerId, value]) => {
    const customer = customers.find(c => c.id === customerId)
    return {
      customer_id: customerId,
      name: customer ? `${customer.first_name} ${customer.last_name}`.trim() : 'Unknown',
      email: customer?.email,
      lifetime_value: value
    }
  })

  clv.clv_segments = {
    vip: { count: topTenPercent, min_value: sortedCustomers[topTenPercent - 1]?.[1] || 0 },
    high_value: { count: topTwentyPercent - topTenPercent, min_value: sortedCustomers[topTwentyPercent - 1]?.[1] || 0 },
    medium_value: { count: Math.floor(totalCustomers * 0.5), min_value: 0 },
    low_value: { count: totalCustomers - Math.floor(totalCustomers * 0.7), min_value: 0 }
  }

  return clv
}

function generateCustomerAnalysisPrompt(data: any): string {
  return `
You are a customer behavior analysis expert. Based on the comprehensive customer data analysis provided, generate strategic insights and recommendations.

Customer Segmentation Analysis:
- Champions: ${data.customerSegments.champions?.customers.length || 0} customers
- Loyal Customers: ${data.customerSegments.loyal_customers?.customers.length || 0} customers  
- At Risk: ${data.customerSegments.at_risk?.customers.length || 0} customers
- New Customers: ${data.customerSegments.new_customers?.customers.length || 0} customers

Purchase Patterns:
- Peak shopping hour: ${data.purchasePatterns.peak_hour}:00
- Peak shopping day: ${data.purchasePatterns.peak_day}
- Average basket value: $${data.purchasePatterns.average_basket_value?.toFixed(2)}
- Average basket size: ${data.purchasePatterns.average_basket_size?.toFixed(1)} items

Loyalty Metrics:
- Repeat purchase rate: ${data.loyaltyMetrics.repeat_purchase_rate?.toFixed(1)}%
- Customer retention rate: ${data.loyaltyMetrics.customer_retention_rate?.toFixed(1)}%

Churn Analysis:
- Churn rate: ${data.churnAnalysis.churn_rate?.toFixed(1)}%
- At-risk customers: ${data.churnAnalysis.at_risk_customers}
- Active customers: ${data.churnAnalysis.active_customers}

Product Preferences:
- Top product affinities: ${JSON.stringify(data.preferenceAnalysis.product_affinities?.slice(0, 3))}

Behavioral Trends:
- Monthly growth: ${JSON.stringify(data.behavioralTrends.month_over_month_growth)}

Lifetime Value:
- Average CLV: $${data.lifetimeValueAnalysis.average_clv?.toFixed(2)}
- High-value customers: ${data.lifetimeValueAnalysis.high_value_customers?.length || 0}

Please provide a JSON response with:
1. "strategic_insights": Array of key strategic insights about customer behavior
2. "marketing_recommendations": Array of specific marketing strategies
3. "retention_strategies": Array of customer retention tactics
4. "growth_opportunities": Array of business growth opportunities
5. "risk_mitigation": Array of strategies to address identified risks
6. "personalization_suggestions": Array of ways to personalize customer experience
7. "operational_improvements": Array of operational changes to enhance customer satisfaction
8. "priority_actions": Array of immediate actions ranked by impact and urgency

Focus on actionable, data-driven recommendations that can drive business growth and customer satisfaction.
`
}

function generateFallbackInsights(customerSegments: any, purchasePatterns: any, churnAnalysis: any) {
  return {
    strategic_insights: [
      `Customer base shows ${Object.keys(customerSegments).length} distinct behavioral segments`,
      `Peak shopping occurs on ${purchasePatterns.peak_day} at ${purchasePatterns.peak_hour}:00`,
      `Current churn rate of ${churnAnalysis.churn_rate?.toFixed(1)}% requires attention`
    ],
    marketing_recommendations: [
      'Implement targeted campaigns for each customer segment',
      'Focus acquisition efforts during peak shopping times',
      'Develop loyalty programs for repeat customers'
    ],
    retention_strategies: [
      'Create win-back campaigns for at-risk customers',
      'Implement personalized recommendations',
      'Establish customer feedback loops'
    ],
    growth_opportunities: [
      'Expand product offerings in high-performing categories',
      'Increase marketing during peak times',
      'Develop premium services for high-value customers'
    ],
    risk_mitigation: [
      'Monitor churn indicators proactively',
      'Improve customer service response times',
      'Address product quality concerns'
    ],
    personalization_suggestions: [
      'Customize product recommendations by segment',
      'Personalize promotional timing',
      'Tailor communication frequency by customer preference'
    ],
    operational_improvements: [
      'Optimize staffing during peak hours',
      'Streamline checkout process',
      'Enhance inventory management for popular products'
    ],
    priority_actions: [
      { action: 'Address customer churn immediately', priority: 'high', impact: 'high' },
      { action: 'Launch retention campaign for at-risk segment', priority: 'high', impact: 'medium' },
      { action: 'Optimize operations for peak times', priority: 'medium', impact: 'medium' }
    ]
  }
}