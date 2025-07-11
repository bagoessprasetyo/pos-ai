'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useProfile } from '@/hooks/use-profile'
import { useAuth } from '@/contexts/auth-context'
import { Settings, Calendar, Mail, Phone, MapPin, Building2, AlertTriangle, LogOut } from 'lucide-react'
import { format } from 'date-fns'

export function AccountSettings() {
  const { profile } = useProfile()
  const { signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  const getAccountCompleteness = () => {
    if (!profile) return 0
    
    let completed = 0
    const total = 5
    
    if (profile.email) completed++
    if (profile.first_name) completed++
    if (profile.last_name) completed++
    if (profile.phone) completed++
    if (profile.avatar_url) completed++
    
    return Math.round((completed / total) * 100)
  }

  const completeness = getAccountCompleteness()

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <CardTitle>Account Overview</CardTitle>
          </div>
          <CardDescription>
            Your account information and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Completeness */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Profile Completeness</span>
              <Badge variant={completeness === 100 ? 'default' : completeness >= 60 ? 'secondary' : 'destructive'}>
                {completeness}% Complete
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  completeness === 100 ? 'bg-green-500' :
                  completeness >= 60 ? 'bg-blue-500' : 'bg-red-500'
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            {completeness < 100 && (
              <p className="text-xs text-muted-foreground">
                Complete your profile to unlock all features
              </p>
            )}
          </div>

          <Separator />

          {/* Account Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email Address</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
              </div>

              {profile?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone Number</p>
                    <p className="text-sm text-muted-foreground">{profile.phone}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.created_at ? format(new Date(profile.created_at), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Account Type</p>
                  <p className="text-sm text-muted-foreground">Business Owner</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Customize your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Language</p>
              <p className="text-sm text-muted-foreground">English (US)</p>
            </div>
            <Badge variant="outline">Default</Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Timezone</p>
              <p className="text-sm text-muted-foreground">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>
            <Badge variant="outline">Auto-detected</Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Currency</p>
              <p className="text-sm text-muted-foreground">USD ($)</p>
            </div>
            <Badge variant="outline">Default</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Actions that affect your account access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
            <div>
              <h4 className="font-medium">Sign Out</h4>
              <p className="text-sm text-muted-foreground">
                Sign out of your account on this device
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="gap-2"
            >
              {isSigningOut ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg opacity-60">
            <div>
              <h4 className="font-medium">Delete Account</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}