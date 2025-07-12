'use client'

import { useStore } from '@/contexts/store-context'

export interface StoreSettings {
  currency: string
  locale: string
  timezone: string
}

export function useStoreSettings(): StoreSettings {
  const { currentStore } = useStore()

  // Default settings - can be overridden by store-specific settings in the future
  const defaultSettings: StoreSettings = {
    currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'USD',
    locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en-US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  // TODO: When store-specific settings are implemented, merge them here
  // const storeSpecificSettings = currentStore?.settings || {}
  
  return {
    ...defaultSettings,
    // Future: ...storeSpecificSettings
  }
}