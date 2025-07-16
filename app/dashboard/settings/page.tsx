'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/contexts/store-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  // Clock, 
  DollarSign,
  Palette,
  Save,
  Settings,
  Building,
  Globe,
  Receipt,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChefHat,
  Bell,
  Timer,
  Users,
  TableProperties,
  Calendar,
  Clock
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Store as StoreType } from '@/types'

const storeSettingsSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  tax_rate: z.number().min(0).max(1),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  business_hours: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  }).optional(),
  receipt_settings: z.object({
    header_text: z.string().optional(),
    footer_text: z.string().optional(),
    show_logo: z.boolean(),
    show_tax_details: z.boolean(),
    show_store_info: z.boolean(),
  }).optional(),
  kitchen_dashboard: z.object({
    enabled: z.boolean(),
    show_timer: z.boolean(),
    show_customer_names: z.boolean(),
    auto_print_tickets: z.boolean(),
    sound_notifications: z.boolean(),
  }).optional(),
  dine_in_service: z.object({
    enabled: z.boolean(),
    default_service_time: z.number().min(30).max(300),
    auto_table_cleanup: z.boolean(),
    reservation_window_days: z.number().min(1).max(90),
    require_reservations: z.boolean(),
    walk_in_enabled: z.boolean(),
    table_numbering_style: z.enum(['numeric', 'alphanumeric', 'custom']),
  }).optional(),
})

type StoreSettingsForm = z.infer<typeof storeSettingsSchema>

const defaultBusinessHours = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '09:00', close: '17:00', closed: false },
  sunday: { open: '10:00', close: '16:00', closed: true },
}

const defaultReceiptSettings = {
  header_text: '',
  footer_text: 'Thank you for your business!',
  show_logo: true,
  show_tax_details: true,
  show_store_info: true,
}

const defaultKitchenDashboard = {
  enabled: false,
  show_timer: true,
  show_customer_names: true,
  auto_print_tickets: false,
  sound_notifications: true,
}

const defaultDineInService = {
  enabled: false,
  default_service_time: 90,
  auto_table_cleanup: true,
  reservation_window_days: 30,
  require_reservations: false,
  walk_in_enabled: true,
  table_numbering_style: 'numeric' as const,
}

export default function StoreSettingsPage() {
  const { currentStore, refreshStores } = useStore()
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const supabase = createClient()

  const form = useForm<StoreSettingsForm>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      tax_rate: 0.08,
      currency: 'USD',
      timezone: 'UTC',
      business_hours: defaultBusinessHours,
      receipt_settings: defaultReceiptSettings,
      kitchen_dashboard: defaultKitchenDashboard,
      dine_in_service: defaultDineInService,
    }
  })

  useEffect(() => {
    if (currentStore) {
      const settings = currentStore.settings as any || {}
      
      form.reset({
        name: currentStore.name,
        description: currentStore.description || '',
        address: currentStore.address || '',
        phone: currentStore.phone || '',
        email: currentStore.email || '',
        tax_rate: currentStore.tax_rate || 0.08,
        currency: currentStore.currency || 'USD',
        timezone: currentStore.timezone || 'UTC',
        business_hours: settings.business_hours || defaultBusinessHours,
        receipt_settings: settings.receipt_settings || defaultReceiptSettings,
        kitchen_dashboard: settings.kitchen_dashboard || defaultKitchenDashboard,
        dine_in_service: settings.dine_in_service || defaultDineInService,
      })
    }
  }, [currentStore, form])

  const onSubmit = async (data: StoreSettingsForm) => {
    if (!currentStore) return

    setLoading(true)
    setSaveStatus('saving')

    try {
      const { business_hours, receipt_settings, kitchen_dashboard, dine_in_service, ...storeData } = data
      
      // Check if kitchen dashboard setting is being enabled
      const prevKitchenEnabled = (currentStore.settings as any)?.kitchen_dashboard?.enabled || false
      const newKitchenEnabled = kitchen_dashboard?.enabled || false
      
      // Check if dine-in service setting is being enabled
      const prevDineInEnabled = (currentStore.settings as any)?.dine_in_service?.enabled || false
      const newDineInEnabled = dine_in_service?.enabled || false
      
      const updateData = {
        ...storeData,
        settings: {
          business_hours,
          receipt_settings,
          kitchen_dashboard,
          dine_in_service,
          ...(currentStore.settings as any || {}),
        }
      }

      const { error } = await supabase
        .from('stores')
        .update(updateData)
        .eq('id', currentStore.id)

      if (error) throw error

      setSaveStatus('success')
      await refreshStores()
      
      // Show appropriate toast notification
      if (!prevKitchenEnabled && newKitchenEnabled) {
        toast.success('Kitchen Dashboard Enabled', {
          description: 'Please refresh the page to see the Kitchen menu in the sidebar.',
          duration: 6000,
        })
      } else if (prevKitchenEnabled && !newKitchenEnabled) {
        toast.info('Kitchen Dashboard Disabled', {
          description: 'Please refresh the page to remove the Kitchen menu from the sidebar.',
          duration: 6000,
        })
      } else if (!prevDineInEnabled && newDineInEnabled) {
        toast.success('Dine-In Service Enabled', {
          description: 'You can now set up your table layout and accept dine-in orders.',
          duration: 6000,
        })
      } else if (prevDineInEnabled && !newDineInEnabled) {
        toast.info('Dine-In Service Disabled', {
          description: 'Table layout and dine-in features have been disabled.',
          duration: 6000,
        })
      } else {
        toast.success('Settings saved successfully!')
      }
      
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to update store settings:', error)
      setSaveStatus('error')
      toast.error('Failed to save settings', {
        description: 'Please try again or contact support if the issue persists.'
      })
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setLoading(false)
    }
  }

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p>No store selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 md:h-8 md:w-8" />
              Store Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your store information and preferences
            </p>
          </div>
          
          {/* Save Status */}
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Saving...</span>
              </div>
            )}
            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Saved!</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Failed to save</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Store Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Store Name *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="My Store"
                    className="h-11 md:h-10"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    {...form.register('phone')}
                    placeholder="+1 (555) 123-4567"
                    className="h-11 md:h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Brief description of your store"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    placeholder="store@example.com"
                    className="h-11 md:h-10"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...form.register('address')}
                    placeholder="123 Main St, City, State 12345"
                    className="h-11 md:h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Business Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    {...form.register('currency')}
                    className="flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="IDR">IDR - Indonesian Rupiah</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...form.register('tax_rate', { valueAsNumber: true })}
                    placeholder="8.25"
                    className="h-11 md:h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    {...form.register('timezone')}
                    className="flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Asia/Jakarta">Jakarta</option>
                    <option value="Asia/Singapore">Singapore</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kitchen Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Kitchen Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="kitchen_enabled"
                  {...form.register('kitchen_dashboard.enabled')}
                  className="h-4 w-4"
                />
                <Label htmlFor="kitchen_enabled" className="text-sm font-medium">
                  Enable Kitchen Dashboard
                </Label>
              </div>
              
              <p className="text-sm text-muted-foreground">
                When enabled, orders will be sent to the kitchen dashboard where staff can manage preparation and notify when orders are ready for pickup.
              </p>
              
              {form.watch('kitchen_dashboard.enabled') && (
                <div className="space-y-3 pt-2 border-t">
                  <h4 className="font-medium text-sm">Kitchen Dashboard Settings</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="show_timer"
                        {...form.register('kitchen_dashboard.show_timer')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="show_timer" className="text-sm font-normal">
                        Show preparation timers
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="show_customer_names"
                        {...form.register('kitchen_dashboard.show_customer_names')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="show_customer_names" className="text-sm font-normal">
                        Show customer names
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto_print_tickets"
                        {...form.register('kitchen_dashboard.auto_print_tickets')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="auto_print_tickets" className="text-sm font-normal">
                        Auto-print kitchen tickets
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="sound_notifications"
                        {...form.register('kitchen_dashboard.sound_notifications')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="sound_notifications" className="text-sm font-normal">
                        Sound notifications
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dine-In Service */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableProperties className="h-5 w-5" />
                Dine-In Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dine_in_enabled"
                  {...form.register('dine_in_service.enabled')}
                  className="h-4 w-4"
                />
                <Label htmlFor="dine_in_enabled" className="text-sm font-medium">
                  Enable Dine-In Service
                </Label>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Enable table layout management and dine-in order processing. You'll be able to set up your restaurant layout and manage table reservations.
              </p>
              
              {form.watch('dine_in_service.enabled') && (
                <div className="space-y-4 pt-2 border-t">
                  <h4 className="font-medium text-sm">Dine-In Service Settings</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="default_service_time">Default Service Time (minutes)</Label>
                      <Input
                        id="default_service_time"
                        type="number"
                        min="30"
                        max="300"
                        {...form.register('dine_in_service.default_service_time', { valueAsNumber: true })}
                        placeholder="90"
                        className="h-11 md:h-10"
                      />
                      <p className="text-xs text-muted-foreground">Expected time customers spend at tables</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reservation_window_days">Reservation Window (days)</Label>
                      <Input
                        id="reservation_window_days"
                        type="number"
                        min="1"
                        max="90"
                        {...form.register('dine_in_service.reservation_window_days', { valueAsNumber: true })}
                        placeholder="30"
                        className="h-11 md:h-10"
                      />
                      <p className="text-xs text-muted-foreground">How far ahead customers can book</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="table_numbering_style">Table Numbering Style</Label>
                      <select
                        id="table_numbering_style"
                        {...form.register('dine_in_service.table_numbering_style')}
                        className="flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="numeric">Numeric (1, 2, 3...)</option>
                        <option value="alphanumeric">Alphanumeric (A1, B2, C3...)</option>
                        <option value="custom">Custom Numbers</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto_table_cleanup"
                        {...form.register('dine_in_service.auto_table_cleanup')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="auto_table_cleanup" className="text-sm font-normal">
                        Auto table cleanup
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="require_reservations"
                        {...form.register('dine_in_service.require_reservations')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="require_reservations" className="text-sm font-normal">
                        Require reservations
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="walk_in_enabled"
                        {...form.register('dine_in_service.walk_in_enabled')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="walk_in_enabled" className="text-sm font-normal">
                        Allow walk-ins
                      </Label>
                    </div>
                  </div>
                  
                  {form.watch('dine_in_service.enabled') && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="flex items-start gap-2">
                        <TableProperties className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h5 className="font-medium text-blue-900 dark:text-blue-100">Next Steps</h5>
                          <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                            After saving these settings, you can set up your table layout by going to <strong>Tables → Layout Designer</strong> in the sidebar.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(defaultBusinessHours).map(([day, defaultHours]) => {
                const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1)
                const watchedHours = form.watch(`business_hours.${day}` as any) || defaultHours
                
                return (
                  <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-20 font-medium">{dayCapitalized}</div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!watchedHours.closed}
                        onChange={(e) => {
                          form.setValue(`business_hours.${day}.closed` as any, !e.target.checked)
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-muted-foreground">Open</span>
                    </div>
                    
                    {!watchedHours.closed && (
                      <>
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            {...form.register(`business_hours.${day}.open` as any)}
                            className="w-28 h-9"
                          />
                          <span className="text-sm text-muted-foreground">to</span>
                          <Input
                            type="time"
                            {...form.register(`business_hours.${day}.close` as any)}
                            className="w-28 h-9"
                          />
                        </div>
                      </>
                    )}
                    
                    {watchedHours.closed && (
                      <div className="text-sm text-muted-foreground">Closed</div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Receipt Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Receipt Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="header_text">Header Text</Label>
                  <Textarea
                    id="header_text"
                    {...form.register('receipt_settings.header_text')}
                    placeholder="Welcome to our store!"
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="footer_text">Footer Text</Label>
                  <Textarea
                    id="footer_text"
                    {...form.register('receipt_settings.footer_text')}
                    placeholder="Thank you for your business!"
                    rows={2}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show_logo"
                    {...form.register('receipt_settings.show_logo')}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="show_logo" className="text-sm font-normal">
                    Show store logo
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show_tax_details"
                    {...form.register('receipt_settings.show_tax_details')}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="show_tax_details" className="text-sm font-normal">
                    Show tax details
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show_store_info"
                    {...form.register('receipt_settings.show_store_info')}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="show_store_info" className="text-sm font-normal">
                    Show store info
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pb-6">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}