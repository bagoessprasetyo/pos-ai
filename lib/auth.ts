import { createClient } from './supabase/client'
import type { User } from '@supabase/supabase-js'

export interface AuthUser extends User {
  profile?: {
    full_name?: string
    avatar_url?: string
    phone?: string
  }
}

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = createClient()
  
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  
  if (!user) return null

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, phone')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    profile: profile || undefined,
  }
}

export async function updateProfile(updates: {
  full_name?: string
  avatar_url?: string
  phone?: string
}) {
  const supabase = createClient()
  const user = await getCurrentUser()
  
  if (!user) throw new Error('No user logged in')

  const { error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw error
}

export async function resetPassword(email: string) {
  const supabase = createClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) throw error
}