'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/contexts/permission-context'
import { Permissions, Permission } from '@/lib/permissions'

interface PermissionGuardProps {
  children: ReactNode
  resource: keyof Permissions
  action: keyof Permission
  fallback?: ReactNode
  requireAll?: boolean // If multiple permissions, require all or just one
}

interface MultiPermissionGuardProps {
  children: ReactNode
  permissions: Array<{
    resource: keyof Permissions
    action: keyof Permission
  }>
  requireAll?: boolean
  fallback?: ReactNode
}

interface RoleGuardProps {
  children: ReactNode
  roles: string[]
  fallback?: ReactNode
}

/**
 * Guard component that shows content only if user has required permission
 */
export function PermissionGuard({ 
  children, 
  resource, 
  action, 
  fallback = null 
}: PermissionGuardProps) {
  const { permissions } = usePermissions()
  
  if (!permissions.can(resource, action)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Guard component that checks multiple permissions
 */
export function MultiPermissionGuard({ 
  children, 
  permissions: requiredPermissions, 
  requireAll = false,
  fallback = null 
}: MultiPermissionGuardProps) {
  const { permissions } = usePermissions()
  
  const hasPermissions = requireAll
    ? requiredPermissions.every(({ resource, action }) => permissions.can(resource, action))
    : requiredPermissions.some(({ resource, action }) => permissions.can(resource, action))
  
  if (!hasPermissions) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Guard component that shows content only for specific roles
 */
export function RoleGuard({ 
  children, 
  roles, 
  fallback = null 
}: RoleGuardProps) {
  const { permissions } = usePermissions()
  const userRole = permissions.getRole()
  
  if (!userRole || !roles.includes(userRole)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Convenience guards for common permission checks
 */
export function ReadGuard({ 
  children, 
  resource, 
  fallback = null 
}: { 
  children: ReactNode
  resource: keyof Permissions
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard resource={resource} action="read" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function WriteGuard({ 
  children, 
  resource, 
  fallback = null 
}: { 
  children: ReactNode
  resource: keyof Permissions
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard resource={resource} action="write" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function DeleteGuard({ 
  children, 
  resource, 
  fallback = null 
}: { 
  children: ReactNode
  resource: keyof Permissions
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard resource={resource} action="delete" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function AdminGuard({ 
  children, 
  resource, 
  fallback = null 
}: { 
  children: ReactNode
  resource: keyof Permissions
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard resource={resource} action="admin" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * Role-specific guards
 */
export function OwnerOnlyGuard({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <RoleGuard roles={['owner']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function ManagerOrHigherGuard({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <RoleGuard roles={['owner', 'manager']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function StaffOnlyGuard({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <RoleGuard roles={['owner', 'manager', 'cashier']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}