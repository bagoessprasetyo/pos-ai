'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface ProfileUpdateData {
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const newProfile = {
            id: user.id,
            email: user.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single()

          if (createError) throw createError
          setProfile(createdProfile)
        } else {
          throw error
        }
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: ProfileUpdateData) => {
    if (!user || !profile) return false

    setUpdating(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(data)
      toast.success('Profile updated successfully')
      return true
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
      return false
    } finally {
      setUpdating(false)
    }
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return null

    try {
      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`])
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const avatarUrl = data.publicUrl

      // Update profile with new avatar URL
      const success = await updateProfile({ avatar_url: avatarUrl })
      
      return success ? avatarUrl : null
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload avatar')
      return null
    }
  }

  const removeAvatar = async () => {
    if (!user || !profile?.avatar_url) return false

    try {
      // Delete from storage
      const oldPath = profile.avatar_url.split('/').pop()
      if (oldPath) {
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${oldPath}`])
      }

      // Update profile
      return await updateProfile({ avatar_url: undefined })
    } catch (error) {
      console.error('Error removing avatar:', error)
      toast.error('Failed to remove avatar')
      return false
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      })

      if (verifyError) {
        toast.error('Current password is incorrect')
        return false
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast.success('Password updated successfully')
      return true
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Failed to change password')
      return false
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [user])

  return {
    profile,
    loading,
    updating,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    changePassword,
    refreshProfile: fetchProfile
  }
}