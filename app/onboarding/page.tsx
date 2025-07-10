'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useStore } from '@/contexts/store-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Store, ArrowRight } from 'lucide-react'
import { storeSchema } from '@/utils/validation'

export default function OnboardingPage() {
  const [storeName, setStoreName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, loading: authLoading } = useAuth()
  const { stores, loading: storeLoading, refreshStores } = useStore()
  const router = useRouter()
  const supabase = createClient()

  // Redirect to dashboard if user already has stores
  useEffect(() => {
    // Wait for both auth and store contexts to finish loading
    if (authLoading || storeLoading) {
      return
    }

    // If user has stores, they shouldn't be on onboarding page
    if (user && stores.length > 0) {
      console.log('Onboarding: User already has stores, redirecting to dashboard')
      router.push('/dashboard')
      return
    }

    // If no user after loading complete, middleware should handle redirect
    if (!user) {
      console.log('Onboarding: No authenticated user found')
      return
    }
  }, [user, authLoading, storeLoading, stores.length, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !storeName.trim()) return

    setLoading(true)
    setError('')

    try {
      console.log('Creating store for user:', user.id)
      
      // Validate store data
      const storeData = storeSchema.parse({
        name: storeName.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      })

      console.log('Store data validated:', storeData)

      // First, ensure user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        if (profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata?.full_name || null,
            })
          
          if (createProfileError) {
            console.error('Failed to create profile:', createProfileError)
            throw new Error(`Profile creation failed: ${createProfileError.message}`)
          }
          console.log('Profile created successfully')
        } else {
          throw new Error(`Profile check failed: ${profileError.message}`)
        }
      } else {
        console.log('Profile exists:', profile.id)
      }

      // Create the store
      console.log('Creating store with data:', {
        name: storeData.name,
        address: storeData.address,
        phone: storeData.phone,
        owner_id: user.id,
      })

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: storeData.name,
          address: storeData.address,
          phone: storeData.phone,
          owner_id: user.id,
        })
        .select()
        .single()

      if (storeError) {
        console.error('Store creation error:', storeError)
        throw new Error(`Store creation failed: ${storeError.message}`)
      }

      console.log('Store created successfully:', store.id)

      // Add user as owner in store_staff table
      const { error: staffError } = await supabase
        .from('store_staff')
        .insert({
          store_id: store.id,
          user_id: user.id,
          role: 'owner',
        })

      if (staffError) {
        console.error('Store staff creation error:', staffError)
        throw new Error(`Staff assignment failed: ${staffError.message}`)
      }

      console.log('Store staff assignment successful')

      // Refresh stores and redirect to dashboard
      await refreshStores()
      console.log('Stores refreshed, redirecting to dashboard')
      router.push('/dashboard')
    } catch (err) {
      console.error('Full error creating store:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred while creating the store')
      }
    } finally {
      setLoading(false)
    }
  }

  // Show loading while either context is loading
  if (authLoading || storeLoading) {
    return <div>Loading...</div>
  }

  // If no user, let middleware handle redirect (shouldn't reach here)
  if (!user) {
    return <div>Redirecting to login...</div>
  }

  // If user has stores, show loading while redirect happens
  if (stores.length > 0) {
    return <div>You already have stores. Redirecting to dashboard...</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Welcome to POS AI</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Let's set up your first store to get started
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                type="text"
                placeholder="Enter your store name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                type="text"
                placeholder="Enter store address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter store phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading || !storeName.trim()}>
              {loading ? 'Creating Store...' : (
                <>
                  Create Store & Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            You can add more stores and customize settings later
          </div>
        </CardContent>
      </Card>
    </div>
  )
}