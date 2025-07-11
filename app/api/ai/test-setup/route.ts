import { NextRequest, NextResponse } from 'next/server'
import { isAIEnabled } from '@/lib/ai/openai-client'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const results = {
      ai_enabled: isAIEnabled(),
      openai_api_key_set: !!process.env.OPENAI_API_KEY,
      database_connected: false,
      forecasts_table_exists: false,
      forecast_alerts_table_exists: false,
      sample_store_id: null,
      transaction_count: 0,
      error: null as string | null
    }

    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        results.error = 'Not authenticated'
        return NextResponse.json(results)
      }

      results.database_connected = true

      // Check if forecasts table exists
      try {
        const { error: forecastsError } = await supabase
          .from('forecasts')
          .select('id')
          .limit(1)
        
        results.forecasts_table_exists = !forecastsError
        if (forecastsError) {
          console.log('Forecasts table error:', forecastsError)
        }
      } catch (e) {
        results.forecasts_table_exists = false
      }

      // Check if forecast_alerts table exists
      try {
        const { error: alertsError } = await supabase
          .from('forecast_alerts')
          .select('id')
          .limit(1)
        
        results.forecast_alerts_table_exists = !alertsError
        if (alertsError) {
          console.log('Forecast alerts table error:', alertsError)
        }
      } catch (e) {
        results.forecast_alerts_table_exists = false
      }

      // Get a sample store and transaction count
      try {
        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .limit(1)

        if (stores && stores.length > 0) {
          results.sample_store_id = stores[0].id

          const { data: transactions, count } = await supabase
            .from('transactions')
            .select('id', { count: 'exact' })
            .eq('store_id', stores[0].id)

          results.transaction_count = count || 0
        }
      } catch (e) {
        console.log('Store/transaction query error:', e)
      }

    } catch (dbError) {
      results.error = `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown'}`
    }

    return NextResponse.json(results)

  } catch (error) {
    return NextResponse.json(
      { error: 'Test setup check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}