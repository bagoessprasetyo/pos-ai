'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingBag, 
  TableProperties, 
  Car,
  Utensils,
  Users,
  CheckCircle,
  Clock,
  MapPin
} from 'lucide-react'
import { useDineInSettings } from '@/hooks/use-dine-in-settings'
import { useTables } from '@/hooks/use-tables'
import { useTableReservations } from '@/hooks/use-table-reservations'
import type { ServiceType, Table, TableSession } from '@/types'

interface ServiceTypeSelectorProps {
  selectedServiceType: ServiceType
  selectedTable: Table | null
  onServiceTypeChange: (serviceType: ServiceType) => void
  onTableSelect: (table: Table | null) => void
}

export function ServiceTypeSelector({
  selectedServiceType,
  selectedTable,
  onServiceTypeChange,
  onTableSelect
}: ServiceTypeSelectorProps) {
  const dineInSettings = useDineInSettings()
  const { tables, areas } = useTables()
  const { sessions } = useTableReservations()
  const [showTableSelection, setShowTableSelection] = useState(false)

  // Get available tables (not occupied)
  const availableTables = tables.filter(table => 
    table.status === 'available' || table.status === 'reserved'
  )

  // Get table session if table is selected
  const selectedTableSession = selectedTable 
    ? sessions.find(session => session.table_id === selectedTable.id && session.status === 'active')
    : null

  // Sort tables naturally by table number for simple display
  const sortedTables = availableTables.sort((a, b) => {
    const aNum = parseInt(a.table_number.replace(/\D/g, '')) || 0
    const bNum = parseInt(b.table_number.replace(/\D/g, '')) || 0
    return aNum - bNum
  })

  const handleServiceTypeSelect = (serviceType: ServiceType) => {
    onServiceTypeChange(serviceType)
    
    // Clear table selection if switching away from dine-in
    if (serviceType !== 'dine_in') {
      onTableSelect(null)
      setShowTableSelection(false)
    } else if (serviceType === 'dine_in') {
      setShowTableSelection(true)
    }
  }

  const handleTableSelect = (table: Table) => {
    onTableSelect(table)
    setShowTableSelection(false)
  }

  const getStatusColor = (table: Table) => {
    switch (table.status) {
      case 'available':
        return 'border-green-200 bg-green-50 hover:bg-green-100'
      case 'reserved':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getStatusIcon = (table: Table) => {
    switch (table.status) {
      case 'available':
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'reserved':
        return <Clock className="h-3 w-3 text-yellow-600" />
      default:
        return null
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Service Type</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Service Type Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Takeout */}
          <Button
            variant={selectedServiceType === 'takeout' ? 'default' : 'outline'}
            onClick={() => handleServiceTypeSelect('takeout')}
            className="h-auto p-3 flex flex-col items-center gap-2"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="text-sm">Takeout</span>
          </Button>

          {/* Delivery */}
          <Button
            variant={selectedServiceType === 'delivery' ? 'default' : 'outline'}
            onClick={() => handleServiceTypeSelect('delivery')}
            className="h-auto p-3 flex flex-col items-center gap-2"
          >
            <Car className="h-5 w-5" />
            <span className="text-sm">Delivery</span>
          </Button>

          {/* Dine In */}
          {dineInSettings.enabled && (
            <Button
              variant={selectedServiceType === 'dine_in' ? 'default' : 'outline'}
              onClick={() => handleServiceTypeSelect('dine_in')}
              className="h-auto p-3 flex flex-col items-center gap-2"
              disabled={availableTables.length === 0}
            >
              <TableProperties className="h-5 w-5" />
              <span className="text-sm">Dine In</span>
              <Badge variant="secondary" className="text-xs">
                {availableTables.length} available
              </Badge>
            </Button>
          )}
        </div>

        {/* Selected Table Info */}
        {selectedServiceType === 'dine_in' && selectedTable && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TableProperties className="h-4 w-4" />
                <span className="font-medium">Table {selectedTable.table_number}</span>
                {getStatusIcon(selectedTable)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTableSelection(true)}
              >
                Change Table
              </Button>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{selectedTable.seats} seats</span>
              </div>
              {selectedTable.notes && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs">{selectedTable.notes}</span>
                </div>
              )}
              {selectedTableSession && (
                <div className="text-orange-600">
                  <Utensils className="h-3 w-3 inline mr-1" />
                  Currently occupied by party of {selectedTableSession.party_size}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table Selection */}
        {showTableSelection && selectedServiceType === 'dine_in' && (
          <div className="border rounded-lg p-4 bg-muted/20">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Select Table</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTableSelection(false)}
              >
                Cancel
              </Button>
            </div>

            {availableTables.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <TableProperties className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tables available</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {sortedTables.map(table => (
                    <button
                      key={table.id}
                      onClick={() => handleTableSelect(table)}
                      className={`p-3 rounded-lg border text-left transition-colors ${getStatusColor(table)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {table.table_number}
                        </span>
                        {getStatusIcon(table)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <Users className="h-3 w-3 inline mr-1" />
                        {table.seats} seats
                      </div>
                      {table.notes && (
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {table.notes}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Table Selection for Dine In */}
        {selectedServiceType === 'dine_in' && !selectedTable && !showTableSelection && availableTables.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowTableSelection(true)}
            className="w-full"
          >
            <TableProperties className="h-4 w-4 mr-2" />
            Select Table ({availableTables.length} available)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}