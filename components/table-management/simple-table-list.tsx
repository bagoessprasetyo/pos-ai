'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
  Edit,
  Trash2,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { Table, TableStatus, TableUpdate } from '@/types'

interface SimpleTableListProps {
  tables: Table[]
  onUpdateTable: (tableId: string, updates: TableUpdate) => Promise<boolean>
  onDeleteTable: (tableId: string) => Promise<boolean>
  onEditTable: (table: Table) => void
}

export function SimpleTableList({ 
  tables, 
  onUpdateTable, 
  onDeleteTable, 
  onEditTable 
}: SimpleTableListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'all'>('all')

  // Filter tables
  const filteredTables = tables.filter(table => {
    const matchesSearch = searchQuery === '' || 
      table.table_number.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

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
          icon: Clock,
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

  const handleStatusChange = async (tableId: string, newStatus: TableStatus) => {
    await onUpdateTable(tableId, { status: newStatus })
  }

  const handleDeleteTable = async (table: Table) => {
    if (confirm(`Are you sure you want to delete ${table.table_number}? This action cannot be undone.`)) {
      await onDeleteTable(table.id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TableStatus | 'all')}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="cleaning">Cleaning</option>
          <option value="out_of_service">Out of Service</option>
        </select>
      </div>

      {/* Tables List */}
      {filteredTables.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <TableProperties className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">No tables found</h3>
              <p className="text-sm">
                {tables.length === 0 
                  ? 'Create your first tables using the setup form above.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead>Table Number</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTables
                  .sort((a, b) => {
                    // Natural sort for table numbers (handles T1, T2, T10 correctly)
                    const aNum = parseInt(a.table_number.replace(/\D/g, '')) || 0
                    const bNum = parseInt(b.table_number.replace(/\D/g, '')) || 0
                    return aNum - bNum
                  })
                  .map((table) => {
                    const statusInfo = getStatusInfo(table.status as TableStatus)
                    const StatusIcon = statusInfo.icon

                    return (
                      <TableRow key={table.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TableProperties className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{table.table_number}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span>{table.seats}</span>
                            {table.min_party_size > 1 && (
                              <span className="text-xs text-muted-foreground">
                                (min {table.min_party_size})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          {table.notes ? (
                            <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                              {table.notes}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditTable(table)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(table.id, 'available' as TableStatus)}
                                disabled={table.status === 'available'}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Set Available
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(table.id, 'cleaning' as TableStatus)}
                                disabled={table.status === 'cleaning'}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Set Cleaning
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(table.id, 'out_of_service' as TableStatus)}
                                disabled={table.status === 'out_of_service'}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Out of Service
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem 
                                onClick={() => handleDeleteTable(table)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Table
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </UITable>
          </CardContent>
        </Card>
      )}
    </div>
  )
}