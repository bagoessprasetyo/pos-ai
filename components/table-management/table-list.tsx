'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Table, TableSession, TableStatus } from '@/types'

interface TableListProps {
  tables: Table[]
  sessions: TableSession[]
  onStatusUpdate: (tableId: string, status: TableStatus) => void
  onSeatGuest: (table: Table) => void
  onClearTable: (tableId: string) => void
  onMarkReady: (tableId: string) => void
}

export function TableList({
  tables,
  sessions,
  onStatusUpdate,
  onSeatGuest,
  onClearTable,
  onMarkReady
}: TableListProps) {
  // Get table session
  const getTableSession = (tableId: string) => {
    return sessions.find(session => session.table_id === tableId && session.status === 'active')
  }

  // Get status display info
  const getStatusInfo = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return { 
          color: 'bg-green-100 text-green-800', 
          icon: CheckCircle,
          label: 'Available' 
        }
      case 'occupied':
        return { 
          color: 'bg-red-100 text-red-800', 
          icon: Users,
          label: 'Occupied' 
        }
      case 'reserved':
        return { 
          color: 'bg-yellow-100 text-yellow-800', 
          icon: Calendar,
          label: 'Reserved' 
        }
      case 'cleaning':
        return { 
          color: 'bg-blue-100 text-blue-800', 
          icon: AlertCircle,
          label: 'Cleaning' 
        }
      case 'out_of_service':
        return { 
          color: 'bg-gray-100 text-gray-800', 
          icon: XCircle,
          label: 'Out of Service' 
        }
      default:
        return { 
          color: 'bg-gray-100 text-gray-800', 
          icon: TableProperties,
          label: 'Unknown' 
        }
    }
  }

  // Format duration
  const formatDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60))
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m`
    }
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}h ${minutes}m`
  }

  if (tables.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <TableProperties className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="font-medium mb-2">No tables found</h3>
        <p className="text-sm">
          No tables match your current filters.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <UITable>
        <TableHeader>
          <TableRow>
            <TableHead>Table</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Seats</TableHead>
            <TableHead>Current Session</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Area</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tables.map((table) => {
            const session = getTableSession(table.id)
            const statusInfo = getStatusInfo(table.status as TableStatus)
            const StatusIcon = statusInfo.icon

            return (
              <TableRow key={table.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TableProperties className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Table {table.table_number}</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge className={`${statusInfo.color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>{table.seats}</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  {session ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3" />
                        Party of {session.party_size}
                      </div>
                      {session.notes && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {session ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatDuration(session.seated_at)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                
                {/* <TableCell>
                  {table.table_areas ? (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: table.table_areas.color || '#3B82F6' }}
                      />
                      <span className="text-sm">{table.table_areas.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No area</span>
                  )}
                </TableCell> */}
                
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {table.status === 'available' && (
                        <>
                          <DropdownMenuItem onClick={() => onSeatGuest(table)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Seat Guests
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
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </UITable>
    </div>
  )
}