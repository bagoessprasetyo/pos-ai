'use client'

import { useState } from 'react'
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

  return (
    <PermissionProvider>
      <div className="min-h-screen bg-background">
        {/* Single Sidebar - handles both desktop and mobile */}
        <Sidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main Content Area */}
        <div className="flex flex-col md:pl-64">
          <Header 
            onMenuClick={() => setSidebarOpen(true)}
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