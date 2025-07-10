'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './auth-context'
import type { Database } from '@/lib/supabase'

type Store = Database['public']['Tables']['stores']['Row']

interface StoreContextType {
  stores: Store[]
  currentStore: Store | null
  loading: boolean
  setCurrentStore: (store: Store) => void
  refreshStores: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([])
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  const refreshStores = async () => {
    if (!user) {
      setStores([])
      setCurrentStore(null)
      setLoading(false)
      return
    }

    try {
      // Get stores where user is either owner OR active staff member
      // First get stores where user is owner
      const { data: ownedStores, error: ownedError } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true)

      if (ownedError) {
        console.error('Error fetching owned stores:', ownedError)
        throw ownedError
      }

      // Then get stores where user is active staff member
      const { data: staffStores, error: staffError } = await supabase
        .from('stores')
        .select(`
          *,
          store_staff!inner(role, is_active)
        `)
        .eq('store_staff.user_id', user.id)
        .eq('store_staff.is_active', true)
        .eq('is_active', true)

      if (staffError) {
        console.error('Error fetching staff stores:', staffError)
        throw staffError
      }

      // Combine and deduplicate stores (user might be both owner and staff)
      const allStores = [...(ownedStores || []), ...(staffStores || [])]
      const uniqueStores = allStores.reduce((acc: Store[], store) => {
        if (!acc.find(s => s.id === store.id)) {
          acc.push(store)
        }
        return acc
      }, [])

      // Sort by creation date
      uniqueStores.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      setStores(uniqueStores)

      // Set current store to first store if none selected
      if (uniqueStores.length > 0 && !currentStore) {
        const savedStoreId = localStorage.getItem('currentStoreId')
        const savedStore = savedStoreId 
          ? uniqueStores.find(s => s.id === savedStoreId)
          : null
        
        setCurrentStore(savedStore || uniqueStores[0])
      } else if (uniqueStores.length === 0) {
        setCurrentStore(null)
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
      setStores([])
      setCurrentStore(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSetCurrentStore = (store: Store) => {
    setCurrentStore(store)
    localStorage.setItem('currentStoreId', store.id)
  }

  useEffect(() => {
    if (user) {
      refreshStores()
    } else {
      setStores([])
      setCurrentStore(null)
      setLoading(false)
    }
  }, [user])

  return (
    <StoreContext.Provider value={{
      stores,
      currentStore,
      loading,
      setCurrentStore: handleSetCurrentStore,
      refreshStores,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}