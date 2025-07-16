'use client'

import { useAuth } from '@/contexts/auth-context'
import { useStore } from '@/contexts/store-context'
import { UserRole } from '@/types'

export function usePermissions() {
  const { user } = useAuth()
  const { currentStore, userRole } = useStore()

  // Check if user has specific permission for a resource and action
  const hasPermission = (resource: string, action: string): boolean => {
    if (!user || !currentStore || !userRole) {
      return false
    }

    // Owner has all permissions
    if (userRole === UserRole.OWNER) {
      return true
    }

    // Manager has most permissions
    if (userRole === UserRole.MANAGER) {
      return true // For now, managers have all permissions
    }

    // Kitchen staff permissions
    if (userRole === UserRole.KITCHEN) {
      switch (resource) {
        case 'kitchen':
          return ['read', 'update'].includes(action)
        case 'orders':
          return ['read', 'update'].includes(action)
        case 'transactions':
          return action === 'read'
        default:
          return false
      }
    }

    // Cashier permissions
    if (userRole === UserRole.CASHIER) {
      switch (resource) {
        case 'pos':
          return true
        case 'transactions':
          return ['read', 'create', 'update'].includes(action)
        case 'products':
          return action === 'read'
        case 'customers':
          return ['read', 'create', 'update'].includes(action)
        case 'kitchen':
          return action === 'read' // Can see kitchen orders for pickup
        default:
          return false
      }
    }

    // Viewer permissions
    if (userRole === UserRole.VIEWER) {
      return action === 'read'
    }

    return false
  }

  // Check if user can access a specific page/route
  const canAccessRoute = (route: string): boolean => {
    if (!user || !currentStore || !userRole) return false

    // Owner has access to all routes
    if (userRole === UserRole.OWNER) return true

    // Manager has access to most routes
    if (userRole === UserRole.MANAGER) {
      return !['/dashboard/settings'].includes(route) // Example restriction
    }

    // Kitchen staff route access
    if (userRole === UserRole.KITCHEN) {
      const allowedRoutes = [
        '/dashboard',
        '/dashboard/kitchen',
        '/dashboard/profile'
      ]
      return allowedRoutes.includes(route)
    }

    // Cashier route access
    if (userRole === UserRole.CASHIER) {
      const allowedRoutes = [
        '/dashboard',
        '/dashboard/pos',
        '/dashboard/transactions',
        '/dashboard/products',
        '/dashboard/profile'
      ]
      return allowedRoutes.includes(route)
    }

    // Viewer route access
    if (userRole === UserRole.VIEWER) {
      const allowedRoutes = [
        '/dashboard',
        '/dashboard/analytics',
        '/dashboard/transactions',
        '/dashboard/products',
        '/dashboard/profile'
      ]
      return allowedRoutes.includes(route)
    }

    return false
  }

  // Check if user can perform actions on specific resources
  const canManageProducts = (): boolean => {
    return hasPermission('products', 'create') && hasPermission('products', 'update')
  }

  const canManageStaff = (): boolean => {
    return hasPermission('staff', 'create') && hasPermission('staff', 'update')
  }

  const canManageStore = (): boolean => {
    return hasPermission('store', 'update')
  }

  const canAccessKitchen = (): boolean => {
    return hasPermission('kitchen', 'read')
  }

  const canManageOrders = (): boolean => {
    return hasPermission('orders', 'update')
  }

  const canProcessTransactions = (): boolean => {
    return hasPermission('transactions', 'create')
  }

  const canViewAnalytics = (): boolean => {
    return hasPermission('analytics', 'read')
  }

  const canManageInventory = (): boolean => {
    return hasPermission('inventory', 'update')
  }

  const canManageCustomers = (): boolean => {
    return hasPermission('customers', 'create') && hasPermission('customers', 'update')
  }

  const canManageDiscounts = (): boolean => {
    return hasPermission('discounts', 'create') && hasPermission('discounts', 'update')
  }

  return {
    hasPermission,
    canAccessRoute,
    canManageProducts,
    canManageStaff,
    canManageStore,
    canAccessKitchen,
    canManageOrders,
    canProcessTransactions,
    canViewAnalytics,
    canManageInventory,
    canManageCustomers,
    canManageDiscounts,
    userRole,
    isOwner: userRole === UserRole.OWNER,
    isManager: userRole === UserRole.MANAGER,
    isCashier: userRole === UserRole.CASHIER,
    isKitchen: userRole === UserRole.KITCHEN,
    isViewer: userRole === UserRole.VIEWER
  }
}