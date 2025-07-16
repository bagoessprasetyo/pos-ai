import { NextRequest, NextResponse } from 'next/server'
import { generateAICompletion, isAIEnabled } from '@/lib/ai/openai-client'
import { createClient } from '@/lib/supabase/server'
import { ensembleForecast, exponentialSmoothing, autoRegressiveForecast } from '@/lib/ai/forecasting-algorithms'

export async function POST(request: NextRequest) {
  try {
    // Check if AI is enabled
    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 503 }
      )
    }

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { store_id, historical_data, forecast_days = 30 } = await request.json()

    if (!store_id || !historical_data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Prepare historical data for AI analysis with enhanced analytics
    const dailySales = aggregateDailySales(historical_data)
    const weeklyPatterns = analyzeWeeklyPatterns(historical_data)
    const monthlyTrends = analyzeMonthlyTrends(historical_data)
    const seasonalAnalysis = analyzeSeasonalPatterns(historical_data)
    const trendAnalysis = analyzeTrends(dailySales)
    const statisticalMetrics = calculateStatisticalMetrics(dailySales)
    const productPerformance = analyzeProductPerformance(historical_data)
    
    // console.log('Aggregated data:', {
    //   dailySalesCount: dailySales.length,
    //   weeklyPatternsCount: weeklyPatterns.length,
    //   monthlyTrendsCount: monthlyTrends.length
    // })

    // Check if we have sufficient data for forecasting
    if (dailySales.length === 0) {
      return NextResponse.json(
        { error: 'No historical sales data available for forecasting' },
        { status: 400 }
      )
    }

    if (dailySales.length < 7) {
      return NextResponse.json(
        { error: 'Insufficient historical data. At least 7 days of sales data required for forecasting.' },
        { status: 400 }
      )
    }

    // Apply advanced forecasting algorithms first
    let advancedForecast = null
    let algorithmError = null
    
    try {
      // Use ensemble forecasting for best results
      advancedForecast = ensembleForecast(dailySales, forecast_days)
      console.log(`Advanced forecast generated using: ${advancedForecast.algorithm_used}`)
    } catch (error) {
      console.warn('Advanced forecasting failed, falling back to AI-only:', error)
      algorithmError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Generate AI-powered forecast with enhanced analytics and algorithm insights
    const algorithmInsights = advancedForecast ? `
Advanced Algorithm Results:
- Algorithm: ${advancedForecast.algorithm_used}
- Model Confidence: ${(advancedForecast.model_confidence * 100).toFixed(1)}%
- Accuracy Metrics: MAPE ${advancedForecast.accuracy_metrics.mape.toFixed(2)}%, R² ${advancedForecast.accuracy_metrics.r_squared.toFixed(3)}
- Seasonal Components: Trend ${advancedForecast.seasonal_components.trend.toFixed(2)}, Seasonality ${advancedForecast.seasonal_components.seasonal_strength.toFixed(2)}
- Statistical Forecasts (first 7 days): ${JSON.stringify(advancedForecast.forecasts.slice(0, 7).map(f => ({ date: f.date, sales: Math.round(f.predicted_sales) })))}
` : `
Algorithm Status: ${algorithmError || 'Advanced algorithms skipped - using AI-only forecast'}
`

    const prompt = `
You are an advanced business forecasting expert with expertise in statistical analysis and machine learning. Based on the comprehensive historical sales data and statistical algorithm results provided, generate a sophisticated sales forecast that enhances and validates the algorithmic predictions.

Enhanced Historical Data Analysis:
- Daily sales data (last 30 days): ${JSON.stringify(dailySales.slice(-30))}
- Weekly patterns: ${JSON.stringify(weeklyPatterns)}
- Monthly trends: ${JSON.stringify(monthlyTrends)}
- Seasonal analysis: ${JSON.stringify(seasonalAnalysis)}
- Trend analysis: ${JSON.stringify(trendAnalysis)}
- Statistical metrics: ${JSON.stringify(statisticalMetrics)}
- Product performance: ${JSON.stringify(productPerformance)}
- Total historical period: ${historical_data.length} transactions
- Data quality score: ${dailySales.length >= 30 ? 'High' : dailySales.length >= 14 ? 'Medium' : 'Low'}

${algorithmInsights}

IMPORTANT: ${advancedForecast ? 'Use the statistical algorithm results as a foundation and enhance them with business intelligence. Your forecasts should be informed by but not necessarily identical to the algorithmic predictions.' : 'Generate forecasts using traditional business analysis methods since advanced algorithms are unavailable.'}

Please provide a JSON response with:
1. "forecasts": Array of daily forecasts for the next ${forecast_days} days with:
   - date (YYYY-MM-DD format)
   - predicted_sales (number) ${advancedForecast ? '- consider the statistical forecasts but adjust for business factors' : ''}
   - predicted_transactions (number)
   - confidence_interval: { lower: number, upper: number }

2. "insights": Object with:
   - period: forecast period description
   - growth_rate: predicted growth rate percentage
   - seasonality_pattern: description of seasonal patterns
   - peak_days: array of day names when sales are typically highest
   - recommended_actions: array of strategic recommendations
   - accuracy_score: confidence in forecast (0-1) ${advancedForecast ? `- consider the algorithm confidence of ${(advancedForecast.model_confidence * 100).toFixed(1)}%` : ''}
   - risk_factors: array of potential risks that could affect forecast
   - opportunity_indicators: array of growth opportunities identified
   - inventory_recommendations: object with product-specific inventory advice
   - pricing_insights: object with pricing optimization suggestions
   - market_conditions: assessment of current market trends
   - algorithm_analysis: ${advancedForecast ? 'assessment of how well the statistical models performed' : 'explanation of why advanced algorithms were not used'}

3. "advanced_metrics": Object with:
   - volatility_index: measure of sales stability (0-1)
   - trend_strength: strength of current trend (-1 to 1)
   - seasonal_factor: impact of seasonality (0-1)
   - customer_retention_indicator: estimated customer loyalty impact
   - revenue_optimization_score: potential for revenue growth (0-1)

Advanced Considerations:
- Multi-layered seasonal patterns (daily, weekly, monthly)
- Statistical significance of trends and patterns
- Volatility analysis and risk assessment
- Product lifecycle stages and performance
- Customer behavior patterns and retention
- Market saturation indicators
- Economic and external factor impacts
- Inventory turnover optimization
- Pricing elasticity insights
- Competitive positioning effects

Provide sophisticated, statistically-grounded forecasts with actionable business intelligence.
`

    const completion = await generateAICompletion([
      { role: 'system', content: 'You are a business forecasting expert specializing in retail sales prediction and trend analysis.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.3,
      maxTokens: 2000
    })

    let forecastData
    try {
      forecastData = JSON.parse(completion)
    } catch (parseError) {
      console.error('Failed to parse AI forecast response:', parseError)
      console.log('AI Response:', completion)
      
      // Enhanced fallback: use advanced algorithms if available, otherwise simple averages
      if (advancedForecast) {
        console.log('Using advanced algorithm results as fallback')
        forecastData = {
          forecasts: advancedForecast.forecasts.map(f => ({
            date: f.date,
            predicted_sales: Math.round(f.predicted_sales * 100) / 100,
            predicted_transactions: f.predicted_transactions,
            confidence_interval: {
              lower: Math.round(f.confidence_interval.lower * 100) / 100,
              upper: Math.round(f.confidence_interval.upper * 100) / 100
            }
          })),
          insights: {
            period: `${forecast_days} days`,
            growth_rate: advancedForecast.seasonal_components.trend * 100,
            seasonality_pattern: `${advancedForecast.algorithm_used} detected ${advancedForecast.seasonal_components.cycle_length}-day cycles`,
            peak_days: ['Friday', 'Saturday', 'Sunday'], // Default based on common patterns
            recommended_actions: [
              `Model confidence: ${(advancedForecast.model_confidence * 100).toFixed(1)}%`,
              `Use ${advancedForecast.algorithm_used} for future forecasts`,
              'Monitor forecast accuracy and adjust parameters'
            ],
            accuracy_score: advancedForecast.model_confidence,
            algorithm_analysis: `Advanced algorithms successfully generated forecasts using ${advancedForecast.algorithm_used}. AI parsing failed but statistical models are reliable.`
          },
          advanced_metrics: {
            volatility_index: Math.min(1, advancedForecast.accuracy_metrics.mape / 100),
            trend_strength: Math.max(-1, Math.min(1, advancedForecast.seasonal_components.trend)),
            seasonal_factor: Math.min(1, advancedForecast.seasonal_components.seasonal_strength),
            customer_retention_indicator: 0.7, // Default
            revenue_optimization_score: advancedForecast.model_confidence
          }
        }
      } else {
        // Basic fallback when both AI and algorithms fail
        const today = new Date()
        const fallbackForecasts = []
        
        // Generate simple fallback forecasts based on historical average
        const avgDailySales = dailySales.length > 0 
          ? dailySales.reduce((a, b) => a + b.sales, 0) / dailySales.length 
          : 0
        const avgTransactions = dailySales.length > 0 
          ? dailySales.reduce((a, b) => a + b.transactions, 0) / dailySales.length 
          : 0
        
        for (let i = 1; i <= forecast_days; i++) {
          const forecastDate = new Date(today)
          forecastDate.setDate(today.getDate() + i)
          
          fallbackForecasts.push({
            date: forecastDate.toISOString().split('T')[0],
            predicted_sales: Math.round(avgDailySales * 100) / 100,
            predicted_transactions: Math.round(avgTransactions),
            confidence_interval: {
              lower: Math.round(avgDailySales * 0.8 * 100) / 100,
              upper: Math.round(avgDailySales * 1.2 * 100) / 100
            }
          })
        }
        
        forecastData = {
          forecasts: fallbackForecasts,
          insights: {
            period: `${forecast_days} days`,
            growth_rate: 0,
            seasonality_pattern: 'Analysis temporarily unavailable - using historical averages',
            peak_days: ['Saturday', 'Sunday'],
            recommended_actions: [
              'Review AI service configuration',
              'Ensure sufficient historical data quality',
              'Contact support if issues persist'
            ],
            accuracy_score: 0.3,
            algorithm_analysis: `Both AI and advanced algorithms failed. Reason: ${algorithmError || 'Unknown'}`
          }
        }
      }
    }

    // Validate forecast data structure
    if (!forecastData.forecasts || !Array.isArray(forecastData.forecasts)) {
      throw new Error('Invalid forecast data structure')
    }

    // Store forecast in database with enhanced metadata
    const { data: forecastRecord, error: insertError } = await supabase
      .from('forecasts')
      .insert({
        store_id,
        forecast_data: forecastData,
        forecast_period: forecast_days,
        algorithm_used: advancedForecast?.algorithm_used || 'AI-only',
        model_confidence: advancedForecast?.model_confidence || 0.7,
        accuracy_score: forecastData.insights?.accuracy_score || 0.7,
        created_by: user.id
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error storing forecast:', insertError)
      // Continue even if storage fails
    } else if (forecastRecord) {
      // Create accuracy tracking records for future evaluation
      try {
        await supabase.rpc('create_forecast_accuracy_tracking', {
          p_forecast_id: forecastRecord.id,
          p_forecast_data: forecastData
        })
      } catch (trackingError) {
        console.error('Error creating accuracy tracking:', trackingError)
        // Continue even if tracking setup fails
      }
    }

    return NextResponse.json(forecastData)

  } catch (error) {
    console.error('Forecast generation error:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 503 }
        )
      }
      if (error.message.includes('quota') || error.message.includes('billing')) {
        return NextResponse.json(
          { error: 'OpenAI API quota exceeded' },
          { status: 503 }
        )
      }
      if (error.message.includes('Invalid AI response format')) {
        return NextResponse.json(
          { error: 'AI generated invalid response format' },
          { status: 500 }
        )
      }
      if (error.message.includes('Invalid forecast data structure')) {
        return NextResponse.json(
          { error: 'AI generated invalid forecast structure' },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate forecast', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function aggregateDailySales(transactions: any[]) {
  const dailyData: { [date: string]: { sales: number, transactions: number } } = {}
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.created_at).toISOString().split('T')[0]
    if (!dailyData[date]) {
      dailyData[date] = { sales: 0, transactions: 0 }
    }
    dailyData[date].sales += transaction.total
    dailyData[date].transactions += 1
  })

  return Object.entries(dailyData)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function analyzeWeeklyPatterns(transactions: any[]) {
  const dayOfWeekSales: { [day: number]: { sales: number, count: number } } = {}
  
  transactions.forEach(transaction => {
    const dayOfWeek = new Date(transaction.created_at).getDay()
    if (!dayOfWeekSales[dayOfWeek]) {
      dayOfWeekSales[dayOfWeek] = { sales: 0, count: 0 }
    }
    dayOfWeekSales[dayOfWeek].sales += transaction.total
    dayOfWeekSales[dayOfWeek].count += 1
  })

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  return Object.entries(dayOfWeekSales).map(([day, data]) => ({
    day: dayNames[parseInt(day)],
    averageSales: data.count > 0 ? data.sales / data.count : 0,
    transactionCount: data.count
  }))
}

function analyzeMonthlyTrends(transactions: any[]) {
  const monthlyData: { [month: string]: { sales: number, transactions: number } } = {}
  
  transactions.forEach(transaction => {
    const month = new Date(transaction.created_at).toISOString().substring(0, 7)
    if (!monthlyData[month]) {
      monthlyData[month] = { sales: 0, transactions: 0 }
    }
    monthlyData[month].sales += transaction.total
    monthlyData[month].transactions += 1
  })

  return Object.entries(monthlyData)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

function analyzeSeasonalPatterns(transactions: any[]) {
  const seasonalData: { [season: string]: { sales: number, transactions: number } } = {
    'Spring': { sales: 0, transactions: 0 },
    'Summer': { sales: 0, transactions: 0 },
    'Fall': { sales: 0, transactions: 0 },
    'Winter': { sales: 0, transactions: 0 }
  }
  
  transactions.forEach(transaction => {
    const month = new Date(transaction.created_at).getMonth()
    let season = 'Spring'
    if (month >= 5 && month <= 7) season = 'Summer'
    else if (month >= 8 && month <= 10) season = 'Fall' 
    else if (month >= 11 || month <= 1) season = 'Winter'
    
    seasonalData[season].sales += transaction.total
    seasonalData[season].transactions += 1
  })

  return Object.entries(seasonalData).map(([season, data]) => ({
    season,
    averageSales: data.transactions > 0 ? data.sales / data.transactions : 0,
    totalSales: data.sales,
    transactionCount: data.transactions
  }))
}

function analyzeTrends(dailySales: any[]) {
  if (dailySales.length < 7) {
    return {
      direction: 'insufficient_data',
      strength: 0,
      slope: 0,
      r_squared: 0,
      volatility: 0
    }
  }

  // Calculate linear regression for trend analysis
  const n = dailySales.length
  const x = dailySales.map((_, i) => i)
  const y = dailySales.map(d => d.sales)
  
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  // Calculate R-squared
  const yMean = sumY / n
  const ssRes = y.reduce((acc, yi, i) => {
    const predicted = slope * x[i] + intercept
    return acc + Math.pow(yi - predicted, 2)
  }, 0)
  const ssTot = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0)
  const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0
  
  // Calculate volatility (coefficient of variation)
  const stdDev = Math.sqrt(y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0) / n)
  const volatility = yMean > 0 ? stdDev / yMean : 0
  
  return {
    direction: slope > 1 ? 'upward' : slope < -1 ? 'downward' : 'stable',
    strength: Math.abs(slope),
    slope,
    r_squared: rSquared,
    volatility,
    trend_confidence: rSquared > 0.7 ? 'high' : rSquared > 0.4 ? 'medium' : 'low'
  }
}

function calculateStatisticalMetrics(dailySales: any[]) {
  if (dailySales.length === 0) {
    return {
      mean: 0,
      median: 0,
      mode: 0,
      standardDeviation: 0,
      variance: 0,
      skewness: 0,
      kurtosis: 0,
      percentiles: { p25: 0, p50: 0, p75: 0, p95: 0 }
    }
  }

  const sales = dailySales.map(d => d.sales).sort((a, b) => a - b)
  const n = sales.length
  const mean = sales.reduce((a, b) => a + b, 0) / n
  
  // Median
  const median = n % 2 === 0 
    ? (sales[n/2 - 1] + sales[n/2]) / 2 
    : sales[Math.floor(n/2)]
  
  // Mode (most frequent value, simplified)
  const frequency: { [key: number]: number } = {}
  sales.forEach(sale => {
    const rounded = Math.round(sale)
    frequency[rounded] = (frequency[rounded] || 0) + 1
  })
  const mode = parseInt(Object.keys(frequency).reduce((a, b) => 
    frequency[parseInt(a)] > frequency[parseInt(b)] ? a : b
  ))
  
  // Variance and standard deviation
  const variance = sales.reduce((acc, sale) => acc + Math.pow(sale - mean, 2), 0) / n
  const standardDeviation = Math.sqrt(variance)
  
  // Skewness and kurtosis
  const skewness = sales.reduce((acc, sale) => acc + Math.pow((sale - mean) / standardDeviation, 3), 0) / n
  const kurtosis = sales.reduce((acc, sale) => acc + Math.pow((sale - mean) / standardDeviation, 4), 0) / n - 3
  
  // Percentiles
  const percentile = (p: number) => {
    const index = (p / 100) * (n - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1
    return sales[lower] * (1 - weight) + sales[upper] * weight
  }
  
  return {
    mean,
    median,
    mode,
    standardDeviation,
    variance,
    skewness,
    kurtosis,
    percentiles: {
      p25: percentile(25),
      p50: percentile(50),
      p75: percentile(75),
      p95: percentile(95)
    }
  }
}

function analyzeProductPerformance(transactions: any[]) {
  const productData: { [productId: string]: { 
    sales: number, 
    quantity: number, 
    revenue: number,
    transactions: number,
    avgPrice: number 
  } } = {}
  
  transactions.forEach(transaction => {
    if (transaction.transaction_items) {
      transaction.transaction_items.forEach((item: any) => {
        if (!productData[item.product_id]) {
          productData[item.product_id] = { 
            sales: 0, 
            quantity: 0, 
            revenue: 0, 
            transactions: 0,
            avgPrice: 0 
          }
        }
        
        productData[item.product_id].quantity += item.quantity
        productData[item.product_id].revenue += item.line_total
        productData[item.product_id].transactions += 1
        productData[item.product_id].sales += 1
      })
    }
  })
  
  // Calculate average prices and performance metrics
  const performance = Object.entries(productData).map(([productId, data]) => ({
    product_id: productId,
    ...data,
    avgPrice: data.quantity > 0 ? data.revenue / data.quantity : 0,
    salesVelocity: data.quantity / Math.max(transactions.length / 30, 1), // Sales per day
    performanceScore: data.revenue * (data.transactions / Math.max(transactions.length, 1))
  })).sort((a, b) => b.performanceScore - a.performanceScore)
  
  return performance.slice(0, 20) // Top 20 performing products
}