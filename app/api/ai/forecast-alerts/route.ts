import { NextRequest, NextResponse } from 'next/server'
import { generateAICompletion } from '@/lib/ai/openai-client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { store_id, forecasts } = await request.json()

    if (!store_id || !forecasts) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get current business metrics for context
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('total, created_at')
      .eq('store_id', store_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    const currentDailyAverage = recentTransactions?.length 
      ? recentTransactions.reduce((sum, t) => sum + t.total, 0) / 30
      : 0

    // Analyze forecast data for alerts
    const prompt = `
You are a business alert system. Analyze the sales forecast data and generate actionable alerts for business owners.

Current Business Context:
- Current daily average sales: $${currentDailyAverage.toFixed(2)}
- Store ID: ${store_id}
- Recent transaction count: ${recentTransactions?.length || 0}

Forecast Data:
${JSON.stringify(forecasts.slice(0, 14), null, 2)}

Generate alerts for:
1. Significant sales opportunities (predicted high sales days)
2. Potential low sales warnings (predicted drops)
3. Trend changes (growth/decline patterns)
4. Seasonal opportunities
5. Inventory planning needs

For each alert, provide:
- type: "opportunity" | "warning" | "trend"
- title: Short descriptive title
- message: Detailed explanation
- severity: "low" | "medium" | "high"
- forecast_date: The date this alert applies to
- predicted_value: The predicted sales value
- threshold_value: The threshold that triggered this alert
- confidence_score: Confidence in this prediction (0-1)

Focus on actionable insights that help business owners make better decisions.
Only generate alerts for significant deviations (>20% from current average).

Respond with JSON: { "alerts": [alert_objects] }
`

    const completion = await generateAICompletion([
      { role: 'system', content: 'You are a business intelligence system specializing in generating actionable alerts from sales forecasts.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.2,
      maxTokens: 1500
    })

    let alertData
    try {
      alertData = JSON.parse(completion)
    } catch (parseError) {
      throw new Error('Invalid AI response format')
    }

    if (!alertData.alerts || !Array.isArray(alertData.alerts)) {
      throw new Error('Invalid alert data structure')
    }

    // Store alerts in database
    const alertsToInsert = alertData.alerts.map((alert: any) => ({
      ...alert,
      id: `${store_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      store_id,
      created_at: new Date().toISOString(),
      dismissed: false
    }))

    const { error: insertError } = await supabase
      .from('forecast_alerts')
      .insert(alertsToInsert)

    if (insertError) {
      console.error('Error storing alerts:', insertError)
      // Continue even if storage fails
    }

    return NextResponse.json({ alerts: alertsToInsert })

  } catch (error) {
    console.error('Alert generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate alerts' },
      { status: 500 }
    )
  }
}