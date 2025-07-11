'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  Users,
  FileText,
  Store,
  Building,
  Tags,
  X,
  Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/contexts/permission-context'
import type { PermissionChecker } from '@/lib/permissions'

// Helper function to check route permissions
function getRoutePermission(route: string, permissions: PermissionChecker): boolean {
  // Dashboard is accessible to all authenticated users
  if (route === '/dashboard') return true
  
  // Route-specific permission checks
  switch (route) {
    case '/dashboard/products':
    case '/dashboard/products/categories':
    case '/dashboard/products/inventory':
    case '/dashboard/products/discounts':
      return permissions.canRead('products')
    
    case '/dashboard/pos':
      return permissions.canAccessPOS()
    
    case '/dashboard/transactions':
      return permissions.canRead('transactions')
    
    case '/dashboard/analytics':
      return permissions.canViewAnalytics()
    
    case '/dashboard/forecasting':
      return permissions.canViewAnalytics()
    
    case '/dashboard/staff':
      return permissions.canRead('staff')
    
    case '/dashboard/stores':
      return permissions.canRead('stores')
    
    case '/dashboard/settings':
      return permissions.canRead('settings')
    
    default:
      return false
  }
}

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Products',
    href: '/dashboard/products',
    icon: Package,
    children: [
      { name: 'All Products', href: '/dashboard/products' },
      { name: 'Categories', href: '/dashboard/products/categories' },
      { name: 'Discounts', href: '/dashboard/products/discounts' },
    ]
  },
  {
    name: 'Point of Sale',
    href: '/dashboard/pos',
    icon: ShoppingCart,
  },
  {
    name: 'Transactions',
    href: '/dashboard/transactions',
    icon: FileText,
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    name: 'AI Forecasting',
    href: '/dashboard/forecasting',
    icon: Brain,
  },
  // {
  //   name: 'Customers',
  //   href: '/dashboard/customers',
  //   icon: Users,
  // },
  {
    name: 'Stores',
    href: '/dashboard/stores',
    icon: Building,
  },
  {
    name: 'Staff',
    href: '/dashboard/staff',
    icon: Users,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    children: [
      { name: 'Store Settings', href: '/dashboard/settings' },
    ]
  },
]

interface SidebarProps {
  open: boolean
  collapsed?: boolean
  onClose: () => void
}

export function Sidebar({ open, collapsed = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { permissions } = usePermissions()

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen transform bg-background border-r border-border transition-all duration-200 ease-in-out",
        // Desktop: respects collapsed state, Mobile: controlled by open state
        "md:translate-x-0",
        collapsed ? "md:w-16" : "md:w-64",
        collapsed ? "w-16" : "w-64",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-4 w-4" />
              </div>
              {!collapsed && <span className="font-bold">POS AI</span>}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                
                // Check if user has permission to access this route
                const canAccess = getRoutePermission(item.href, permissions)
                
                if (!canAccess) {
                  return null
                }
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        collapsed && "justify-center",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      onClick={() => {
                        // Close sidebar on mobile when clicking a link
                        if (window.innerWidth < 768) {
                          onClose()
                        }
                      }}
                      title={collapsed ? item.name : undefined}
                    >
                      <Icon className="w-5 h-5" />
                      {!collapsed && item.name}
                    </Link>
                    
                    {/* Sub-navigation */}
                    {item.children && isActive && !collapsed && (
                      <ul className="ml-6 mt-2 space-y-1">
                        {item.children.map((child) => {
                          const childCanAccess = getRoutePermission(child.href, permissions)
                          
                          if (!childCanAccess) {
                            return null
                          }
                          
                          return (
                            <li key={child.name}>
                              <Link
                                href={child.href}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg px-3 py-1 text-sm transition-colors",
                                  pathname === child.href
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                                onClick={() => {
                                  if (window.innerWidth < 768) {
                                    onClose()
                                  }
                                }}
                              >
                                {child.name}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  )
}