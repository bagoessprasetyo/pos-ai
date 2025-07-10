// Debug script to investigate analytics dashboard data issues
// Run with: node debug-analytics.js

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Read environment variables from .env.local
let supabaseUrl, supabaseKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1]
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1]
    }
  }
} catch (error) {
  console.error('Could not read .env.local file')
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAnalytics() {
  console.log('🔍 Debugging Analytics Dashboard Data Issues\n')

  try {
    // 1. Check if we can connect to the database
    console.log('1. Testing Database Connection...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('transactions')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message)
      return
    }
    console.log('✅ Database connection successful\n')

    // 2. Check total transactions count
    console.log('2. Checking Total Transactions...')
    const { count: totalTransactions, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Error counting transactions:', countError.message)
    } else {
      console.log(`📊 Total transactions in database: ${totalTransactions}`)
    }

    // 3. Get sample transaction data
    console.log('\n3. Sample Transaction Data...')
    const { data: sampleTransactions, error: sampleError } = await supabase
      .from('transactions')
      .select(`
        id,
        store_id,
        transaction_number,
        total,
        status,
        type,
        created_at,
        transaction_items (
          id,
          quantity,
          unit_price,
          line_total
        )
      `)
      .limit(3)
      .order('created_at', { ascending: false })
    
    if (sampleError) {
      console.error('❌ Error fetching sample transactions:', sampleError.message)
    } else {
      console.log('Sample transactions:')
      sampleTransactions?.forEach((txn, index) => {
        console.log(`  ${index + 1}. ${txn.transaction_number} - ${txn.total} (${txn.status}) - Items: ${txn.transaction_items?.length || 0}`)
        console.log(`     Store ID: ${txn.store_id}, Created: ${txn.created_at}`)
      })
    }

    // 4. Check stores data
    console.log('\n4. Checking Stores Data...')
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, owner_id')
      .limit(3)
    
    if (storesError) {
      console.error('❌ Error fetching stores:', storesError.message)
    } else {
      console.log('Available stores:')
      stores?.forEach((store, index) => {
        console.log(`  ${index + 1}. ${store.name} (ID: ${store.id})`)
      })
    }

    // 5. Test today's transactions query (similar to analytics)
    console.log('\n5. Testing Today\'s Transactions Query...')
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    // Use the first store for testing
    const testStoreId = stores?.[0]?.id
    if (!testStoreId) {
      console.log('❌ No store available for testing')
      return
    }
    
    console.log(`Testing with store ID: ${testStoreId}`)
    console.log(`Start of day filter: ${startOfDay.toISOString()}`)
    
    const { data: todayTransactions, error: todayError } = await supabase
      .from('transactions')
      .select(`
        id,
        total,
        created_at,
        transaction_items (
          quantity
        )
      `)
      .eq('store_id', testStoreId)
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false })
    
    if (todayError) {
      console.error('❌ Error fetching today\'s transactions:', todayError.message)
    } else {
      console.log(`📈 Today's transactions for store ${testStoreId}: ${todayTransactions?.length || 0}`)
      const todaysSales = todayTransactions?.reduce((sum, t) => sum + t.total, 0) || 0
      console.log(`💰 Today's sales total: $${todaysSales.toFixed(2)}`)
    }

    // 6. Test transaction_items query
    console.log('\n6. Testing Transaction Items Query...')
    const { data: transactionItems, error: itemsError } = await supabase
      .from('transaction_items')
      .select(`
        product_id,
        quantity,
        unit_price,
        products!inner (
          name
        ),
        transactions!inner (
          store_id,
          created_at
        )
      `)
      .eq('transactions.store_id', testStoreId)
      .gte('transactions.created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5)
    
    if (itemsError) {
      console.error('❌ Error fetching transaction items:', itemsError.message)
    } else {
      console.log(`📦 Transaction items found: ${transactionItems?.length || 0}`)
      transactionItems?.forEach((item, index) => {
        console.log(`  ${index + 1}. Product: ${item.products?.name}, Qty: ${item.quantity}, Price: $${item.unit_price}`)
      })
    }

    // 7. Check RLS policies by testing without store filter
    console.log('\n7. Testing RLS Policies...')
    const { data: allTransactions, error: rlsError } = await supabase
      .from('transactions')
      .select('id, store_id, total')
      .limit(5)
    
    if (rlsError) {
      console.error('❌ RLS Policy Error (this might be expected):', rlsError.message)
    } else {
      console.log(`🔒 RLS allows access to ${allTransactions?.length || 0} transactions`)
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message)
  }
}

// Run the debug script
debugAnalytics().then(() => {
  console.log('\n🏁 Debug script completed')
  process.exit(0)
}).catch((error) => {
  console.error('💥 Script failed:', error)
  process.exit(1)
})