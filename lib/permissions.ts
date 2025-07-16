import type { StaffMemberWithProfile, Profile } from '@/types'

// Define the permission structure
export interface Permission {
  read: boolean
  write: boolean
  delete: boolean
  admin: boolean
}

export interface Permissions {
  products: Permission
  categories: Permission
  inventory: Permission
  discounts: Permission
  transactions: Permission
  analytics: Permission
  staff: Permission
  stores: Permission
  settings: Permission
  pos: Permission
  kitchen: Permission
  tables: Permission
}

// Default permissions for each role
export const rolePermissions: Record<string, Permissions> = {
  owner: {
    products: { read: true, write: true, delete: true, admin: true },
    categories: { read: true, write: true, delete: true, admin: true },
    inventory: { read: true, write: true, delete: true, admin: true },
    discounts: { read: true, write: true, delete: true, admin: true },
    transactions: { read: true, write: true, delete: true, admin: true },
    analytics: { read: true, write: true, delete: true, admin: true },
    staff: { read: true, write: true, delete: true, admin: true },
    stores: { read: true, write: true, delete: true, admin: true },
    settings: { read: true, write: true, delete: true, admin: true },
    pos: { read: true, write: true, delete: true, admin: true },
    kitchen: { read: true, write: true, delete: true, admin: true },
    tables: { read: true, write: true, delete: true, admin: true },
  },
  manager: {
    products: { read: true, write: true, delete: true, admin: false },
    categories: { read: true, write: true, delete: true, admin: false },
    inventory: { read: true, write: true, delete: false, admin: false },
    discounts: { read: true, write: true, delete: true, admin: false },
    transactions: { read: true, write: true, delete: false, admin: false },
    analytics: { read: true, write: false, delete: false, admin: false },
    staff: { read: true, write: false, delete: false, admin: false },
    stores: { read: true, write: false, delete: false, admin: false },
    settings: { read: true, write: true, delete: false, admin: false },
    pos: { read: true, write: true, delete: false, admin: false },
    kitchen: { read: true, write: true, delete: false, admin: false },
    tables: { read: true, write: true, delete: false, admin: false },
  },
  cashier: {
    products: { read: true, write: false, delete: false, admin: false },
    categories: { read: true, write: false, delete: false, admin: false },
    inventory: { read: true, write: false, delete: false, admin: false },
    discounts: { read: true, write: false, delete: false, admin: false },
    transactions: { read: true, write: true, delete: false, admin: false },
    analytics: { read: false, write: false, delete: false, admin: false },
    staff: { read: false, write: false, delete: false, admin: false },
    stores: { read: false, write: false, delete: false, admin: false },
    settings: { read: false, write: false, delete: false, admin: false },
    pos: { read: true, write: true, delete: false, admin: false },
    kitchen: { read: true, write: false, delete: false, admin: false },
    tables: { read: true, write: false, delete: false, admin: false },
  },
  viewer: {
    products: { read: true, write: false, delete: false, admin: false },
    categories: { read: true, write: false, delete: false, admin: false },
    inventory: { read: true, write: false, delete: false, admin: false },
    discounts: { read: true, write: false, delete: false, admin: false },
    transactions: { read: true, write: false, delete: false, admin: false },
    analytics: { read: true, write: false, delete: false, admin: false },
    staff: { read: false, write: false, delete: false, admin: false },
    stores: { read: false, write: false, delete: false, admin: false },
    settings: { read: false, write: false, delete: false, admin: false },
    pos: { read: false, write: false, delete: false, admin: false },
    kitchen: { read: false, write: false, delete: false, admin: false },
    tables: { read: false, write: false, delete: false, admin: false },
  },
  kitchen: {
    products: { read: true, write: false, delete: false, admin: false },
    categories: { read: true, write: false, delete: false, admin: false },
    inventory: { read: true, write: false, delete: false, admin: false },
    discounts: { read: true, write: false, delete: false, admin: false },
    transactions: { read: true, write: true, delete: false, admin: false },
    analytics: { read: false, write: false, delete: false, admin: false },
    staff: { read: false, write: false, delete: false, admin: false },
    stores: { read: false, write: false, delete: false, admin: false },
    settings: { read: false, write: false, delete: false, admin: false },
    pos: { read: false, write: false, delete: false, admin: false },
    kitchen: { read: true, write: true, delete: false, admin: false },
    tables: { read: true, write: false, delete: false, admin: false },
  },
}

// Permission checking functions
export class PermissionChecker {
  constructor(private staffMember: StaffMemberWithProfile | null) {}

  /**
   * Check if user has permission for a specific resource and action
   */
  can(resource: keyof Permissions, action: keyof Permission): boolean {
    if (!this.staffMember) return false
    
    const permissions = this.getPermissions()
    return permissions[resource]?.[action] ?? false
  }

  /**
   * Check if user can read a resource
   */
  canRead(resource: keyof Permissions): boolean {
    return this.can(resource, 'read')
  }

  /**
   * Check if user can write to a resource
   */
  canWrite(resource: keyof Permissions): boolean {
    return this.can(resource, 'write')
  }

  /**
   * Check if user can delete from a resource
   */
  canDelete(resource: keyof Permissions): boolean {
    return this.can(resource, 'delete')
  }

  /**
   * Check if user has admin access to a resource
   */
  canAdmin(resource: keyof Permissions): boolean {
    return this.can(resource, 'admin')
  }

  /**
   * Check if user is an owner
   */
  isOwner(): boolean {
    return this.staffMember?.role === 'owner'
  }

  /**
   * Check if user is a manager or higher
   */
  isManagerOrHigher(): boolean {
    return this.staffMember?.role === 'owner' || this.staffMember?.role === 'manager'
  }

  /**
   * Check if user can access POS
   */
  canAccessPOS(): boolean {
    return this.canRead('pos')
  }

  /**
   * Check if user can access kitchen dashboard
   */
  canAccessKitchen(): boolean {
    return this.canRead('kitchen')
  }

  /**
   * Check if user can process transactions
   */
  canProcessTransactions(): boolean {
    return this.canWrite('transactions')
  }

  /**
   * Check if user can manage staff
   */
  canManageStaff(): boolean {
    return this.canWrite('staff')
  }

  /**
   * Check if user can manage stores
   */
  canManageStores(): boolean {
    return this.canWrite('stores')
  }

  /**
   * Check if user can view analytics
   */
  canViewAnalytics(): boolean {
    return this.canRead('analytics')
  }

  /**
   * Get the user's role
   */
  getRole(): string | null {
    return this.staffMember?.role ?? null
  }

  /**
   * Get full permissions object for the user
   */
  getPermissions(): Permissions {
    if (!this.staffMember) {
      // Return empty permissions for no user
      return Object.keys(rolePermissions.viewer).reduce((acc, key) => {
        acc[key as keyof Permissions] = { read: false, write: false, delete: false, admin: false }
        return acc
      }, {} as Permissions)
    }

    // Get base permissions for role
    const basePermissions = rolePermissions[this.staffMember.role] || rolePermissions.viewer
    
    // Merge with any custom permissions stored in the staff record
    const customPermissions = this.staffMember.permissions?.permissions || {}
    
    return {
      ...basePermissions,
      ...customPermissions
    }
  }

  /**
   * Get user info for display
   */
  getUserInfo() {
    if (!this.staffMember) return null
    
    return {
      name: this.staffMember.full_name || 'Unknown User',
      email: this.staffMember.email,
      role: this.staffMember.role,
      isActive: this.staffMember.is_active
    }
  }
}

// Hook-like function to create permission checker
export function createPermissionChecker(staffMember: StaffMemberWithProfile | null): PermissionChecker {
  return new PermissionChecker(staffMember)
}

// Utility functions for common permission checks
export const permissions = {
  /**
   * Check if route is accessible by role
   */
  canAccessRoute(route: string, role: string): boolean {
    const routePermissions: Record<string, string[]> = {
      '/dashboard': ['owner', 'manager', 'cashier', 'viewer'],
      '/dashboard/products': ['owner', 'manager', 'cashier', 'viewer'],
      '/dashboard/products/categories': ['owner', 'manager'],
      '/dashboard/products/inventory': ['owner', 'manager'],
      '/dashboard/products/discounts': ['owner', 'manager'],
      '/dashboard/pos': ['owner', 'manager', 'cashier'],
      '/dashboard/kitchen': ['owner', 'manager', 'kitchen'],
      '/dashboard/table-layout': ['owner', 'manager'],
      '/dashboard/tables': ['owner', 'manager', 'cashier'],
      '/dashboard/reservations': ['owner', 'manager', 'cashier'],
      '/dashboard/transactions': ['owner', 'manager', 'cashier'],
      '/dashboard/analytics': ['owner', 'manager', 'viewer'],
      '/dashboard/staff': ['owner'],
      '/dashboard/stores': ['owner'],
      '/dashboard/settings': ['owner', 'manager'],
    }

    return routePermissions[route]?.includes(role) ?? false
  },

  /**
   * Get allowed routes for a role
   */
  getAllowedRoutes(role: string): string[] {
    const allRoutes = [
      '/dashboard',
      '/dashboard/products',
      '/dashboard/products/categories',
      '/dashboard/products/inventory', 
      '/dashboard/products/discounts',
      '/dashboard/pos',
      '/dashboard/kitchen',
      '/dashboard/table-layout',
      '/dashboard/tables',
      '/dashboard/reservations',
      '/dashboard/transactions',
      '/dashboard/analytics',
      '/dashboard/staff',
      '/dashboard/stores',
      '/dashboard/settings',
    ]

    return allRoutes.filter(route => this.canAccessRoute(route, role))
  },

  /**
   * Get permission description for role
   */
  getRoleDescription(role: string): string {
    const descriptions: Record<string, string> = {
      owner: 'Full access to all features and settings',
      manager: 'Manage products, view reports, limited settings access',
      cashier: 'Process sales, view products, limited access',
      kitchen: 'Manage kitchen orders, view order details, limited access',
      viewer: 'Read-only access to products and reports'
    }

    return descriptions[role] || 'Unknown role'
  }
}