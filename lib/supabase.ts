import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)

// Server-side Supabase client
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseKey)
}

// Database types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          name: string
          description: string | null
          address: string | null
          phone: string | null
          email: string | null
          owner_id: string
          settings: any | null
          tax_rate: number
          currency: string
          timezone: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          owner_id: string
          settings?: any | null
          tax_rate?: number
          currency?: string
          timezone?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          owner_id?: string
          settings?: any | null
          tax_rate?: number
          currency?: string
          timezone?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          store_id: string
          name: string
          description: string | null
          parent_id: string | null
          image_url: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          description?: string | null
          parent_id?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          description?: string | null
          parent_id?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          store_id: string
          category_id: string | null
          name: string
          description: string | null
          sku: string | null
          barcode: string | null
          price: number
          cost: number | null
          weight: number | null
          dimensions: any | null
          images: any | null
          variants: any | null
          tags: string[] | null
          is_active: boolean
          is_featured: boolean
          tax_exempt: boolean
          track_inventory: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          category_id?: string | null
          name: string
          description?: string | null
          sku?: string | null
          barcode?: string | null
          price: number
          cost?: number | null
          weight?: number | null
          dimensions?: any | null
          images?: any | null
          variants?: any | null
          tags?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          tax_exempt?: boolean
          track_inventory?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          sku?: string | null
          barcode?: string | null
          price?: number
          cost?: number | null
          weight?: number | null
          dimensions?: any | null
          images?: any | null
          variants?: any | null
          tags?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          tax_exempt?: boolean
          track_inventory?: boolean
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          store_id: string
          customer_id: string | null
          cashier_id: string
          transaction_number: string
          type: 'sale' | 'return' | 'void'
          status: 'pending' | 'completed' | 'cancelled' | 'refunded'
          subtotal: number
          tax_amount: number
          discount_amount: number
          total: number
          tendered: number | null
          change_due: number | null
          notes: string | null
          receipt_data: any | null
          metadata: any | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          customer_id?: string | null
          cashier_id: string
          transaction_number: string
          type: 'sale' | 'return' | 'void'
          status?: 'pending' | 'completed' | 'cancelled' | 'refunded'
          subtotal: number
          tax_amount: number
          discount_amount: number
          total: number
          tendered?: number | null
          change_due?: number | null
          notes?: string | null
          receipt_data?: any | null
          metadata?: any | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          customer_id?: string | null
          cashier_id?: string
          transaction_number?: string
          type?: 'sale' | 'return' | 'void'
          status?: 'pending' | 'completed' | 'cancelled' | 'refunded'
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total?: number
          tendered?: number | null
          change_due?: number | null
          notes?: string | null
          receipt_data?: any | null
          metadata?: any | null
          completed_at?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}