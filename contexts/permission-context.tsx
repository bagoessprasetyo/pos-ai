'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from './store-context'
import { PermissionChecker, createPermissionChecker } from '@/lib/permissions'
import type { StaffMemberWithProfile } from '@/types'

interface PermissionContextType {
  permissions: PermissionChecker
  staffMember: StaffMemberWithProfile | null
  loading: boolean
  error: string | null
  refreshPermissions: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [staffMember, setStaffMember] = useState<StaffMemberWithProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const supabase = createClient()

  const fetchStaffMember = async () => {
    if (!currentStore) {
      setStaffMember(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: user, error: userError } = await supabase.auth.getUser()
      if (userError || !user.user) {
        throw new Error('Not authenticated')
      }

      // Get staff record for current user and store
      const { data, error } = await supabase
        .from('store_staff')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('store_id', currentStore.id)
        .eq('user_id', user.user.id)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error
      }

      if (data) {
        // Transform the data to match StaffMemberWithProfile interface
        const staffMemberData: StaffMemberWithProfile = {
          id: data.id,
          store_id: data.store_id,
          user_id: data.user_id,
          role: data.role,
          permissions: data.permissions,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at,
          email: data.profile.email,
          full_name: data.profile.full_name,
          phone: data.profile.phone,
          avatar_url: data.profile.avatar_url,
          hourly_rate: data.permissions?.hourly_rate || null
        }

        setStaffMember(staffMemberData)
      } else {
        // User is not a staff member of this store
        setStaffMember(null)
      }
    } catch (err) {
      console.error('Error fetching staff member:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions')
      setStaffMember(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshPermissions = async () => {
    await fetchStaffMember()
  }

  // Fetch staff member when store changes or on mount
  useEffect(() => {
    fetchStaffMember()
  }, [currentStore])

  // Create permission checker
  const permissions = createPermissionChecker(staffMember)

  const value: PermissionContextType = {
    permissions,
    staffMember,
    loading,
    error,
    refreshPermissions
  }

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

// Convenience hooks for common permission checks
export function useCanAccess(resource: keyof import('@/lib/permissions').Permissions, action: keyof import('@/lib/permissions').Permission) {
  const { permissions } = usePermissions()
  return permissions.can(resource, action)
}

export function useCanRead(resource: keyof import('@/lib/permissions').Permissions) {
  const { permissions } = usePermissions()
  return permissions.canRead(resource)
}

export function useCanWrite(resource: keyof import('@/lib/permissions').Permissions) {
  const { permissions } = usePermissions()
  return permissions.canWrite(resource)
}

export function useCanDelete(resource: keyof import('@/lib/permissions').Permissions) {
  const { permissions } = usePermissions()
  return permissions.canDelete(resource)
}

export function useIsOwner() {
  const { permissions } = usePermissions()
  return permissions.isOwner()
}

export function useIsManagerOrHigher() {
  const { permissions } = usePermissions()
  return permissions.isManagerOrHigher()
}

export function useUserRole() {
  const { permissions } = usePermissions()
  return permissions.getRole()
}