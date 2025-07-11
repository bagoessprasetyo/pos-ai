'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { PermissionProvider } from '@/contexts/permission-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed')
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState))
    }
  }, [])

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState))
  }

  return (
    <PermissionProvider>
      <div className="min-h-screen bg-background">
        {/* Single Sidebar - handles both desktop and mobile */}
        <Sidebar 
          open={sidebarOpen} 
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main Content Area */}
        <div className={`flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
        }`}>
          <Header 
            onMenuClick={() => setSidebarOpen(true)}
            onToggleSidebar={toggleSidebar}
            showMenuButton={true}
          />
          
          <main className="flex-1 p-4 pb-20 md:pb-4">
            {children}
          </main>
        </div>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </PermissionProvider>
  )
}