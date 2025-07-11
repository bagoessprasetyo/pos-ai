import { NextRequest, NextResponse } from 'next/server'
import { generateRateLimitedCompletion, isAIEnabled } from '@/lib/ai/openai-client'
import { createRecommendationPrompt, sanitizePromptData, truncateDataForPrompt } from '@/lib/ai/prompts'
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
    const { store_id, cart_items, available_products, recent_purchases } = body

    // Validate required fields
    if (!store_id || !cart_items || !Array.isArray(cart_items)) {
      return NextResponse.json(
        { error: 'Missing required fields: store_id, cart_items' },
        { status: 400 }
      )
    }

    if (cart_items.length === 0) {
      return NextResponse.json({
        recommendations: [],
        generated_at: new Date().toISOString(),
        context_hash: 'empty_cart'
      })
    }

    // Verify user has access to this store
    const { data: storeAccess, error: storeError } = await supabase
      .from('stores')
      .select('id, name')
      .or(`owner_id.eq.${user.id},store_staff.user_id.eq.${user.id}`)
      .eq('id', store_id)
      .single()

    if (storeError || !storeAccess) {
      return NextResponse.json(
        { error: 'Access denied to this store' },
        { status: 403 }
      )
    }

    // Sanitize and truncate data for prompt efficiency
    const sanitizedCartItems = sanitizePromptData(cart_items)
    const sanitizedAvailableProducts = truncateDataForPrompt(
      sanitizePromptData(available_products || []), 
      50 // Limit to 50 products for token efficiency
    )
    const sanitizedRecentPurchases = truncateDataForPrompt(
      sanitizePromptData(recent_purchases || []), 
      20
    )

    // Create the prompt
    const prompt = createRecommendationPrompt(
      sanitizedCartItems,
      sanitizedAvailableProducts,
      sanitizedRecentPurchases
    )

    console.log('Generating recommendations for store:', store_id, 'cart items:', cart_items.length)

    // Generate recommendations using OpenAI
    const aiResponse = await generateRateLimitedCompletion([
      {
        role: 'system',
        content: 'You are an expert sales assistant. Provide product recommendations that genuinely add value to customers and increase revenue. Always respond in valid JSON format.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.6, // Slightly more deterministic for recommendations
      maxTokens: 1000
    })

    // Parse the AI response
    let recommendations
    try {
      recommendations = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Failed to parse AI recommendations response:', parseError)
      console.log('AI Response:', aiResponse)
      
      // Fallback: return empty recommendations
      recommendations = { recommendations: [] }
    }

    // Validate recommendations structure
    if (!recommendations.recommendations || !Array.isArray(recommendations.recommendations)) {
      console.warn('Invalid recommendations structure, returning empty array')
      recommendations = { recommendations: [] }
    }

    // Filter recommendations to ensure product exists and is available
    const validRecommendations = recommendations.recommendations.filter((rec: any) => {
      return rec.product_id && 
             rec.product_name && 
             rec.reason && 
             rec.type &&
             available_products?.some((p: any) => p.id === rec.product_id)
    }).slice(0, 5) // Limit to 5 recommendations

    // Store recommendations for analytics
    try {
      const recommendationPromises = validRecommendations.map((rec: any) => 
        supabase
          .from('ai_recommendations')
          .insert({
            store_id,
            product_id: rec.product_id,
            context_data: {
              cart_items: sanitizedCartItems,
              recommendation_type: rec.type,
              reason: rec.reason
            },
            recommendation_type: rec.type,
            confidence_score: rec.confidence_score || 0.5,
          })
      )
      
      await Promise.allSettled(recommendationPromises)
    } catch (dbError) {
      console.warn('Failed to store recommendations in database:', dbError)
      // Continue anyway - don't fail the request
    }

    // Generate context hash for caching
    const contextHash = Buffer.from(
      JSON.stringify(sanitizedCartItems.map((item: any) => `${item.id}-${item.quantity}`).sort())
    ).toString('base64')

    return NextResponse.json({
      recommendations: validRecommendations,
      generated_at: new Date().toISOString(),
      context_hash: contextHash
    })

  } catch (error) {
    console.error('Error generating recommendations:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Track recommendation interactions
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { store_id, product_id, action, recommendation_type } = body

    // Validate required fields
    if (!store_id || !product_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: store_id, product_id, action' },
        { status: 400 }
      )
    }

    // Update recommendation interaction
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (action === 'click') {
      updateData.clicked = true
    } else if (action === 'purchase') {
      updateData.purchased = true
    }

    const { error } = await supabase
      .from('ai_recommendations')
      .update(updateData)
      .eq('store_id', store_id)
      .eq('product_id', product_id)
      .eq('recommendation_type', recommendation_type)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error tracking recommendation interaction:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to track interaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}