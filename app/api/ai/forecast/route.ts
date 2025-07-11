import { NextRequest, NextResponse } from 'next/server'
import { generateAICompletion, isAIEnabled } from '@/lib/ai/openai-client'
import { createClient } from '@/lib/supabase/server'

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

    // Prepare historical data for AI analysis
    // console.log('Historical data received:', { 
    //   transactionCount: historical_data?.length || 0,
    //   sampleData: historical_data?.slice(0, 2) 
    // })
    
    const dailySales = aggregateDailySales(historical_data)
    const weeklyPatterns = analyzeWeeklyPatterns(historical_data)
    const monthlyTrends = analyzeMonthlyTrends(historical_data)
    
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

    // Generate AI-powered forecast
    const prompt = `
You are a business forecasting expert. Based on the historical sales data provided, generate a detailed sales forecast.

Historical Data Analysis:
- Daily sales data: ${JSON.stringify(dailySales.slice(-30))}
- Weekly patterns: ${JSON.stringify(weeklyPatterns)}
- Monthly trends: ${JSON.stringify(monthlyTrends)}
- Total historical period: ${historical_data.length} transactions
- Average daily sales: $${dailySales.length > 0 ? (dailySales.reduce((a, b) => a + b.sales, 0) / dailySales.length).toFixed(2) : '0.00'}

Please provide a JSON response with:
1. "forecasts": Array of daily forecasts for the next ${forecast_days} days with:
   - date (YYYY-MM-DD format)
   - predicted_sales (number)
   - predicted_transactions (number)
   - confidence_interval: { lower: number, upper: number }

2. "insights": Object with:
   - period: forecast period description
   - growth_rate: predicted growth rate percentage
   - seasonality_pattern: description of seasonal patterns
   - peak_days: array of day names when sales are typically highest
   - recommended_actions: array of strategic recommendations
   - accuracy_score: confidence in forecast (0-1)

Consider:
- Seasonal patterns and trends
- Day-of-week effects
- Recent growth or decline trends
- Market conditions and business cycles
- Statistical confidence intervals

Provide realistic, data-driven forecasts with actionable insights.
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
      
      // Fallback: create a basic forecast structure with minimal predictions
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
          accuracy_score: 0.3
        }
      }
    }

    // Validate forecast data structure
    if (!forecastData.forecasts || !Array.isArray(forecastData.forecasts)) {
      throw new Error('Invalid forecast data structure')
    }

    // Store forecast in database
    const { error: insertError } = await supabase
      .from('forecasts')
      .insert({
        store_id,
        forecast_data: forecastData,
        forecast_period: forecast_days,
        created_by: user.id,
        accuracy_score: forecastData.insights?.accuracy_score || 0.7
      })

    if (insertError) {
      console.error('Error storing forecast:', insertError)
      // Continue even if storage fails
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