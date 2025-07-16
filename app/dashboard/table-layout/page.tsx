'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDineInSettings } from '@/hooks/use-dine-in-settings'
import { useTables } from '@/hooks/use-tables'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  TableProperties, 
  Settings,
  AlertCircle,
  CheckCircle2,
  Plus
} from 'lucide-react'
import { SimpleTableSetup } from '@/components/table-management/simple-table-setup'
import { SimpleTableList } from '@/components/table-management/simple-table-list'
import { SimpleTableEdit } from '@/components/table-management/simple-table-edit'
import type { Table, TableWithArea } from '@/types'

export default function TableLayoutPage() {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const dineInSettings = useDineInSettings()
  const { tables, loading, createTables, updateTable, deleteTable } = useTables()
  
  const [editingTable, setEditingTable] = useState<Table | null>(null)

  // Check if user has access to table layout
  useEffect(() => {
    if (!dineInSettings.enabled) {
      router.push('/dashboard/settings')
      return
    }
    
    if (!hasPermission('tables', 'write')) {
      router.push('/dashboard')
      return
    }
  }, [dineInSettings.enabled, hasPermission, router])

  // Don't render if dine-in is disabled or user doesn't have permission
  if (!dineInSettings.enabled || !hasPermission('tables', 'write')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  const handleEditTable = (table: Table) => {
    setEditingTable(table)
  }

  const handleCloseEdit = () => {
    setEditingTable(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <TableProperties className="h-6 w-6 md:h-8 md:w-8" />
              Table Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Simple table setup and management for your restaurant
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <TableProperties className="h-3 w-3" />
              {tables.length} Table{tables.length !== 1 ? 's' : ''}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/dashboard/settings')}
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Setup Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Create Tables</h2>
          </div>
          <SimpleTableSetup 
            onCreateTables={createTables}
            existingTableCount={tables.length}
          />
        </div>

        <Separator />

        {/* Tables List Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TableProperties className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Your Tables</h2>
            </div>
            {tables.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>{tables.filter(t => t.status === 'available').length} Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span>{tables.filter(t => t.status === 'occupied').length} Occupied</span>
                </div>
              </div>
            )}
          </div>
          
          <SimpleTableList 
            tables={tables}
            onUpdateTable={updateTable}
            onDeleteTable={deleteTable}
            onEditTable={handleEditTable}
          />
        </div>

        {/* Info Card */}
        {tables.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <TableProperties className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No tables created yet</h3>
                <p className="text-sm mb-4">
                  Use the setup form above to quickly create tables with automatic numbering.
                </p>
                <div className="text-xs space-y-1">
                  <p>💡 <strong>Tip:</strong> You can use prefixes like "T" for T1, T2, T3...</p>
                  <p>🎯 <strong>Simple:</strong> Just enter how many tables you need and default seat count</p>
                  <p>📱 <strong>POS Ready:</strong> Tables will appear immediately in your POS system</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Table Modal */}
      {editingTable && (
        <SimpleTableEdit 
          table={editingTable}
          onClose={handleCloseEdit}
          onUpdate={updateTable}
        />
      )}
    </div>
  )
}