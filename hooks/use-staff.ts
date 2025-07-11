'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import type { 
  StoreStaff,
  StoreStaffInsert, 
  StoreStaffUpdate,
  StaffMemberWithProfile,
  Profile
} from '@/types'

export function useStaff() {
  const [staff, setStaff] = useState<StaffMemberWithProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const supabase = createClient()

  const fetchStaff = async (storeId?: string) => {
    if (!storeId && !currentStore) return []

    const targetStoreId = storeId || currentStore?.id
    if (!targetStoreId) return []

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('store_staff')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('store_id', targetStoreId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform the data to match StaffMemberWithProfile interface
      const staffMembers: StaffMemberWithProfile[] = data.map(item => ({
        id: item.id,
        store_id: item.store_id,
        user_id: item.user_id,
        role: item.role,
        permissions: item.permissions,
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
        email: item.profile.email,
        full_name: item.profile.full_name,
        phone: item.profile.phone,
        avatar_url: item.profile.avatar_url,
        hourly_rate: item.permissions?.hourly_rate || null
      }))

      setStaff(staffMembers)
      return staffMembers
    } catch (err) {
      console.error('Error fetching staff:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch staff')
      return []
    } finally {
      setLoading(false)
    }
  }

  const addStaffMember = async (staffData: {
    email: string
    role: 'owner' | 'manager' | 'cashier' | 'viewer'
    permissions?: any
    store_id?: string
  }) => {
    if (!currentStore && !staffData.store_id) {
      throw new Error('No store selected')
    }

    const targetStoreId = staffData.store_id || currentStore?.id!

    try {
      setLoading(true)
      setError(null)

      // First, check if user exists in profiles
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', staffData.email)
        .single()

      let userId: string

      if (existingProfile) {
        userId = existingProfile.id
      } else {
        // If user doesn't exist, we'll need to invite them
        // For now, we'll create a placeholder profile
        // In a real implementation, you'd send an email invitation
        throw new Error('User not found. Please implement invitation system.')
      }

      // Check if user is already staff at this store
      const { data: existingStaff, error: checkError } = await supabase
        .from('store_staff')
        .select('id')
        .eq('store_id', targetStoreId)
        .eq('user_id', userId)
        .single()

      if (existingStaff) {
        throw new Error('User is already a staff member at this store')
      }

      // Add staff member
      const { data, error } = await supabase
        .from('store_staff')
        .insert({
          store_id: targetStoreId,
          user_id: userId,
          role: staffData.role,
          permissions: {
            ...staffData.permissions,
            invited_by: (await supabase.auth.getUser()).data.user?.id,
            invited_at: new Date().toISOString()
          }
        } as StoreStaffInsert)
        .select()
        .single()

      if (error) throw error

      await fetchStaff(targetStoreId)
      return data
    } catch (err) {
      console.error('Error adding staff member:', err)
      setError(err instanceof Error ? err.message : 'Failed to add staff member')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateStaffMember = async (
    staffId: string, 
    updates: StoreStaffUpdate
  ) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('store_staff')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)
        .select()
        .single()

      if (error) throw error

      await fetchStaff()
      return data
    } catch (err) {
      console.error('Error updating staff member:', err)
      setError(err instanceof Error ? err.message : 'Failed to update staff member')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const removeStaffMember = async (staffId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('store_staff')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)

      if (error) throw error

      await fetchStaff()
    } catch (err) {
      console.error('Error removing staff member:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove staff member')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const toggleStaffStatus = async (staffId: string, isActive: boolean) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('store_staff')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)

      if (error) throw error

      await fetchStaff()
    } catch (err) {
      console.error('Error toggling staff status:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle staff status')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getStaffByRole = (role: string) => {
    return staff.filter(member => member.role === role)
  }

  const getStaffPermissions = async (userId: string, storeId?: string) => {
    const targetStoreId = storeId || currentStore?.id
    if (!targetStoreId) return null

    try {
      const { data, error } = await supabase
        .from('store_staff')
        .select('role, permissions')
        .eq('store_id', targetStoreId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error fetching staff permissions:', err)
      return null
    }
  }

  const getCurrentUserStaffRecord = async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user || !currentStore) return null

    return staff.find(member => member.user_id === user.user.id)
  }

  // Auto-fetch staff when store changes
  useEffect(() => {
    if (currentStore) {
      fetchStaff()
    }
  }, [currentStore])

  return {
    staff,
    loading,
    error,
    fetchStaff,
    addStaffMember,
    updateStaffMember,
    removeStaffMember,
    toggleStaffStatus,
    getStaffByRole,
    getStaffPermissions,
    getCurrentUserStaffRecord
  }
}