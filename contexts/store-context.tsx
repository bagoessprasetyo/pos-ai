'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './auth-context'
import type { Database } from '@/lib/supabase'
import { UserRole } from '@/types'

type Store = Database['public']['Tables']['stores']['Row']

interface StoreContextType {
  stores: Store[]
  currentStore: Store | null
  userRole: UserRole | null
  loading: boolean
  setCurrentStore: (store: Store) => void
  refreshStores: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([])
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  // Function to get user role for a specific store
  const getUserRoleForStore = async (storeId: string): Promise<UserRole | null> => {
    if (!user) return null

    try {
      // Check if user is the owner of the store
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('owner_id')
        .eq('id', storeId)
        .single()

      if (storeError) throw storeError

      if (storeData.owner_id === user.id) {
        return UserRole.OWNER
      }

      // Check if user is staff member
      const { data: staffData, error: staffError } = await supabase
        .from('store_staff')
        .select('role')
        .eq('store_id', storeId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (staffError) {
        console.log('No staff record found for user in store')
        return null
      }

      return staffData.role as UserRole
    } catch (error) {
      console.error('Error getting user role for store:', error)
      return null
    }
  }

  const refreshStores = async () => {
    if (!user) {
      setStores([])
      setCurrentStore(null)
      setUserRole(null)
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
        
        const storeToSet = savedStore || uniqueStores[0]
        setCurrentStore(storeToSet)
        
        // Get and set user role for the selected store
        const role = await getUserRoleForStore(storeToSet.id)
        setUserRole(role)
        console.log('Initial user role for store', storeToSet.id, ':', role)
      } else if (uniqueStores.length === 0) {
        setCurrentStore(null)
        setUserRole(null)
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
      setStores([])
      setCurrentStore(null)
      setUserRole(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSetCurrentStore = async (store: Store) => {
    setCurrentStore(store)
    localStorage.setItem('currentStoreId', store.id)
    
    // Get and set user role for the new store
    const role = await getUserRoleForStore(store.id)
    setUserRole(role)
    console.log('User role for store', store.id, ':', role)
  }

  useEffect(() => {
    if (user) {
      refreshStores()
    } else {
      setStores([])
      setCurrentStore(null)
      setUserRole(null)
      setLoading(false)
    }
  }, [user])

  return (
    <StoreContext.Provider value={{
      stores,
      currentStore,
      userRole,
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