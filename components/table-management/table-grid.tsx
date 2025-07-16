'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  TableProperties, 
  Users, 
  Clock, 
  MoreVertical,
  UserPlus,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Table, TableArea, TableSession, TableStatus } from '@/types'

interface TableGridProps {
  tables: Table[]
  areas: TableArea[]
  sessions: TableSession[]
  onStatusUpdate: (tableId: string, status: TableStatus) => void
  onSeatGuest: (table: Table) => void
  onClearTable: (tableId: string) => void
  onMarkReady: (tableId: string) => void
  onMakeReservation: (table: Table) => void
}

export function TableGrid({
  tables,
  areas,
  sessions,
  onStatusUpdate,
  onSeatGuest,
  onClearTable,
  onMarkReady,
  onMakeReservation
}: TableGridProps) {
  const [selectedArea, setSelectedArea] = useState<string | 'all'>('all')

  // Filter tables by selected area
  const filteredTables = selectedArea === 'all' 
    ? tables 
    : tables.filter(table => table.area_id === selectedArea)

  // Group tables by area
  const tablesByArea = areas.reduce((acc, area) => {
    acc[area.id] = tables.filter(table => table.area_id === area.id)
    return acc
  }, {} as Record<string, Table[]>)

  // Get table session
  const getTableSession = (tableId: string) => {
    return sessions.find(session => session.table_id === tableId && session.status === 'active')
  }

  // Get status display info
  const getStatusInfo = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: CheckCircle,
          label: 'Available' 
        }
      case 'occupied':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: Users,
          label: 'Occupied' 
        }
      case 'reserved':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: Calendar,
          label: 'Reserved' 
        }
      case 'cleaning':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          icon: AlertCircle,
          label: 'Cleaning' 
        }
      case 'out_of_service':
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: XCircle,
          label: 'Out of Service' 
        }
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: TableProperties,
          label: 'Unknown' 
        }
    }
  }

  // Render table card
  const renderTableCard = (table: Table) => {
    const session = getTableSession(table.id)
    const statusInfo = getStatusInfo(table.status as TableStatus)
    const StatusIcon = statusInfo.icon

    return (
      <Card key={table.id} className={`relative transition-all hover:shadow-md ${statusInfo.color}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <TableProperties className="h-4 w-4" />
              <span className="font-medium">Table {table.table_number}</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table.status === 'available' && (
                  <>
                    <DropdownMenuItem onClick={() => onSeatGuest(table)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Seat Guests
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onMakeReservation(table)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Make Reservation
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {table.status === 'occupied' && session && (
                  <>
                    <DropdownMenuItem onClick={() => onClearTable(table.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Clear Table
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {table.status === 'cleaning' && (
                  <>
                    <DropdownMenuItem onClick={() => onMarkReady(table.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Ready
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem onClick={() => onStatusUpdate(table.id, 'available')}>
                  Set Available
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusUpdate(table.id, 'cleaning')}>
                  Set Cleaning
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusUpdate(table.id, 'out_of_service')}>
                  Set Out of Service
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Seats:</span>
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {table.seats}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge className={`text-xs ${statusInfo.color}`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>

            {session && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Party of {session.party_size}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(session.seated_at).toLocaleTimeString()}
                  </span>
                </div>
                {session.notes && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {session.notes}
                  </p>
                )}
              </div>
            )}

            {table.notes && !session && (
              <p className="text-xs text-muted-foreground truncate pt-2 border-t border-border">
                {table.notes}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (filteredTables.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <TableProperties className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="font-medium mb-2">No tables found</h3>
        <p className="text-sm">
          {selectedArea === 'all' 
            ? 'No tables have been created yet. Create your first table in the layout designer.'
            : 'No tables found in the selected area.'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Area Filter */}
      {areas.length > 0 && (
        <div className="pb-4">
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant={selectedArea === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedArea('all')}
            >
              All Areas ({tables.length})
            </Button>
            {areas.map(area => (
              <Button
                key={area.id}
                variant={selectedArea === area.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedArea(area.id)}
                className="whitespace-nowrap"
              >
                <div 
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: area.color || '#3B82F6' }}
                />
                {area.name} ({tablesByArea[area.id]?.length || 0})
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Tables Grid */}
      <div className="flex-1 overflow-y-auto">
        {selectedArea === 'all' ? (
          // Show all tables grouped by area
          <div className="space-y-6">
            {areas.map(area => {
              const areaTables = tablesByArea[area.id] || []
              if (areaTables.length === 0) return null

              return (
                <div key={area.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: area.color || '#3B82F6' }}
                    />
                    <h4 className="font-medium">{area.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {areaTables.length} tables
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {areaTables.map(renderTableCard)}
                  </div>
                </div>
              )
            })}
            
            {/* Tables without area */}
            {(() => {
              const tablesWithoutArea = tables.filter(table => !table.area_id)
              if (tablesWithoutArea.length === 0) return null
              
              return (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded bg-gray-400" />
                    <h4 className="font-medium">Unassigned Tables</h4>
                    <Badge variant="secondary" className="text-xs">
                      {tablesWithoutArea.length} tables
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tablesWithoutArea.map(renderTableCard)}
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          // Show tables for selected area
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTables.map(renderTableCard)}
          </div>
        )}
      </div>
    </div>
  )
}