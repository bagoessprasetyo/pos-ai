'use client'

import { useStore } from '@/contexts/store-context'

export interface StoreSettings {
  currency: string
  locale: string
  timezone: string
  kitchen_dashboard_enabled: boolean
  kitchen_dashboard_settings?: {
    show_timer: boolean
    show_customer_names: boolean
    auto_print_tickets: boolean
    sound_notifications: boolean
  }
}

export function useStoreSettings(): StoreSettings {
  const { currentStore } = useStore()

  // Default settings - can be overridden by store-specific settings in the future
  const defaultSettings: StoreSettings = {
    currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'IDR',
    locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'id-ID',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    kitchen_dashboard_enabled: false,
    kitchen_dashboard_settings: {
      show_timer: true,
      show_customer_names: true,
      auto_print_tickets: false,
      sound_notifications: true
    }
  }

  // Merge store-specific settings
  const storeSpecificSettings = (currentStore?.settings as any)?.kitchen_dashboard || {}
  
  return {
    ...defaultSettings,
    kitchen_dashboard_enabled: storeSpecificSettings.enabled || false,
    kitchen_dashboard_settings: {
      ...defaultSettings.kitchen_dashboard_settings,
      ...storeSpecificSettings
    }
  }
}