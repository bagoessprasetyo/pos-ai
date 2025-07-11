import { NextRequest, NextResponse } from 'next/server'
import { generateRateLimitedCompletion, isAIEnabled } from '@/lib/ai/openai-client'
import { createBusinessInsightsPrompt, sanitizePromptData } from '@/lib/ai/prompts'
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

    // Get user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { store_id, analytics_data, top_products, category_performance } = body

    // Validate required fields
    if (!store_id || !analytics_data) {
      return NextResponse.json(
        { error: 'Missing required fields: store_id, analytics_data' },
        { status: 400 }
      )
    }

    // Verify user has access to this store (either as owner or staff)
    // First check if user is the owner
    let { data: storeAccess, error: storeError } = await supabase
      .from('stores')
      .select('id, name, owner_id')
      .eq('id', store_id)
      .eq('owner_id', user.id)
      .single()

    // If not owner, check if user is staff
    if (storeError || !storeAccess) {
      const { data: staffAccess, error: staffError } = await supabase
        .from('store_staff')
        .select(`
          store_id,
          stores!inner(id, name)
        `)
        .eq('store_id', store_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (staffError || !staffAccess) {
        console.log('Access denied - not owner or staff:', { 
          userId: user.id, 
          storeId: store_id,
          ownerError: storeError,
          staffError: staffError 
        })
        return NextResponse.json(
          { error: 'Access denied to this store' },
          { status: 403 }
        )
      }

      // User is staff, use store info from the join
      storeAccess = {
        id: staffAccess.stores[0]?.id || store_id,
        name: staffAccess.stores[0]?.name || '',
        owner_id: null // Not needed for staff access
      }
    }

    // Sanitize data to remove sensitive information
    const sanitizedAnalytics = sanitizePromptData(analytics_data)
    const sanitizedTopProducts = sanitizePromptData(top_products || [])
    const sanitizedCategoryPerformance = sanitizePromptData(category_performance || [])

    // Create the prompt
    const prompt = createBusinessInsightsPrompt(
      sanitizedAnalytics,
      sanitizedTopProducts,
      sanitizedCategoryPerformance
    )

    console.log('Generating AI insights for store:', store_id)

    // Generate insights using OpenAI
    const aiResponse = await generateRateLimitedCompletion([
      {
        role: 'system',
        content: 'You are an expert retail business analyst. Provide actionable, data-driven insights in valid JSON format.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.7,
      maxTokens: 2000
    })

    // Parse the AI response
    let insights
    try {
      insights = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.log('AI Response:', aiResponse)
      
      // Fallback: create a basic insight structure
      insights = {
        insights: [{
          title: 'Analysis Complete',
          description: 'AI analysis completed but response formatting needs adjustment. Raw insights available in system logs.',
          type: 'trend',
          priority: 'medium',
          actionable_steps: ['Review detailed analytics data', 'Contact support if issues persist'],
          potential_impact: 'System optimization needed',
          confidence_score: 0.5
        }]
      }
    }

    // Validate insights structure
    if (!insights.insights || !Array.isArray(insights.insights)) {
      throw new Error('Invalid insights structure returned from AI')
    }

    // Store insights in database for future reference
    try {
      await supabase
        .from('ai_insights')
        .insert({
          store_id,
          type: 'business_insight',
          content: insights,
          confidence_score: 0.8, // Average confidence
        })
    } catch (dbError) {
      console.warn('Failed to store insights in database:', dbError)
      // Continue anyway - don't fail the request
    }

    return NextResponse.json({
      insights: insights.insights,
      generated_at: new Date().toISOString(),
      store_id
    })

  } catch (error) {
    console.error('Error generating AI insights:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!storeId) {
      return NextResponse.json(
        { error: 'Missing store_id parameter' },
        { status: 400 }
      )
    }

    // Get user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get recent insights from database
    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('store_id', storeId)
      .eq('type', 'business_insight')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return NextResponse.json({
      insights: insights || [],
      store_id: storeId
    })

  } catch (error) {
    console.error('Error fetching AI insights:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}