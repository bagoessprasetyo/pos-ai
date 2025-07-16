'use client'

import { useStore } from '@/contexts/store-context'
import type { DineInSettings } from '@/types'

export function useDineInSettings(): DineInSettings {
  const { currentStore } = useStore()

  // Default dine-in settings
  const defaultSettings: DineInSettings = {
    enabled: false,
    default_service_time: 90,
    auto_table_cleanup: true,
    reservation_window_days: 30,
    require_reservations: false,
    walk_in_enabled: true,
    table_numbering_style: 'numeric',
  }

  // Get dine-in settings from store
  const dineInSettings = (currentStore?.settings as any)?.dine_in_service || {}
  
  return {
    ...defaultSettings,
    ...dineInSettings,
  }
}

export function useTableLayoutSettings() {
  const { currentStore } = useStore()

  // Default table layout settings
  const defaultLayoutSettings = {
    grid_size: 20,
    default_table_shape: 'rectangle' as const,
    default_table_seats: 4,
    areas: [],
  }

  // Get table layout settings from store
  const layoutSettings = (currentStore?.settings as any)?.table_layout || {}
  
  return {
    ...defaultLayoutSettings,
    ...layoutSettings,
  }
}