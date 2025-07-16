'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDineInSettings } from '@/hooks/use-dine-in-settings'
import { useTables } from '@/hooks/use-tables'
import { useTableReservations } from '@/hooks/use-table-reservations'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TableProperties, 
  Plus, 
  Search, 
  Filter,
  Clock,
  Users,
  Calendar,
  Settings,
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Utensils
} from 'lucide-react'
import { TableGrid } from '@/components/table-management/table-grid'
import { TableList } from '@/components/table-management/table-list'
import { QuickActions } from '@/components/table-management/quick-actions'
import { ReservationsList } from '@/components/table-management/reservations-list'
import { TableStats } from '@/components/table-management/table-stats'
import { SeatGuestDialog } from '@/components/table-management/seat-guest-dialog'
import { ReservationDialog } from '@/components/table-management/reservation-dialog'
import type { Table, TableStatus } from '@/types'

export default function TableManagementPage() {
  const router = useRouter()
  const dineInSettings = useDineInSettings()
  const { hasPermission } = usePermissions()
  const { tables, areas, loading, updateTableStatus, getTableStats, refetch } = useTables()
  const { 
    reservations, 
    sessions, 
    getUpcomingReservations, 
    clearTable, 
    markTableReady,
    refetch: refetchReservations 
  } = useTableReservations()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showSeatDialog, setShowSeatDialog] = useState(false)
  const [showReservationDialog, setShowReservationDialog] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Check access permissions
  useEffect(() => {
    if (!dineInSettings.enabled) {
      router.push('/dashboard/settings')
      return
    }
    
    if (!hasPermission('tables', 'read')) {
      router.push('/dashboard')
      return
    }
  }, [dineInSettings.enabled, hasPermission, router])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refetch()
      refetchReservations()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, refetch, refetchReservations])

  // Filter tables based on search and status
  const filteredTables = tables.filter(table => {
    const matchesSearch = searchQuery === '' || 
      table.table_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (table.notes && table.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Get statistics
  const stats = getTableStats()
  const upcomingReservations = getUpcomingReservations()

  // Handle table status update
  const handleStatusUpdate = async (tableId: string, status: TableStatus) => {
    await updateTableStatus(tableId, status)
  }

  // Handle table clear
  const handleClearTable = async (tableId: string) => {
    const activeSession = sessions.find(s => s.table_id === tableId && s.status === 'active')
    if (activeSession) {
      await clearTable(activeSession.id)
    }
  }

  // Handle table ready
  const handleMarkReady = async (tableId: string) => {
    await markTableReady(tableId)
  }

  // Handle seat guest
  const handleSeatGuest = (table: Table) => {
    setSelectedTable(table)
    setShowSeatDialog(true)
  }

  // Handle make reservation
  const handleMakeReservation = (table?: Table) => {
    setSelectedTable(table || null)
    setShowReservationDialog(true)
  }

  if (!dineInSettings.enabled || !hasPermission('tables', 'read')) {
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <TableProperties className="h-6 w-6 md:h-8 md:w-8" />
              Table Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor table status and manage seating in real-time
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'text-green-600' : 'text-gray-600'}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch()
                refetchReservations()
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 md:p-6 pb-0">
        <TableStats 
          stats={stats}
          upcomingReservations={upcomingReservations.length}
          activeSessions={sessions.length}
        />
      </div>

      {/* Filters and Controls */}
      <div className="p-4 md:p-6 pb-0">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search and Filter */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
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
              className="px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
              <option value="cleaning">Cleaning</option>
              <option value="out_of_service">Out of Service</option>
            </select>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8"
              >
                <TableProperties className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              onClick={() => handleMakeReservation()}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Reservation
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="tables" className="h-full flex flex-col">
          <div className="px-4 md:px-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="tables">Tables</TabsTrigger>
              <TabsTrigger value="reservations">Reservations</TabsTrigger>
              <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tables" className="flex-1 overflow-hidden mt-4">
            <div className="h-full px-4 md:px-6 pb-6">
              {viewMode === 'grid' ? (
                <TableGrid
                  tables={filteredTables}
                  areas={areas}
                  sessions={sessions}
                  onStatusUpdate={handleStatusUpdate}
                  onSeatGuest={handleSeatGuest}
                  onClearTable={handleClearTable}
                  onMarkReady={handleMarkReady}
                  onMakeReservation={handleMakeReservation}
                />
              ) : (
                <TableList
                  tables={filteredTables}
                  sessions={sessions}
                  onStatusUpdate={handleStatusUpdate}
                  onSeatGuest={handleSeatGuest}
                  onClearTable={handleClearTable}
                  onMarkReady={handleMarkReady}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="reservations" className="flex-1 overflow-auto mt-4">
            <div className="px-4 md:px-6 pb-6">
              <ReservationsList
                reservations={reservations}
                onMakeReservation={handleMakeReservation}
              />
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="flex-1 overflow-auto mt-4">
            <div className="px-4 md:px-6 pb-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Active Table Sessions ({sessions.length})</h3>
                
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Utensils className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active table sessions</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {sessions.map(session => (
                      <Card key={session.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">
                                Table {session.tables.table_number}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {session.party_size} guests
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(session.seated_at).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClearTable(session.table_id)}
                            >
                              Clear Table
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Actions */}
      <QuickActions
        onSeatWalkIn={() => setShowSeatDialog(true)}
        onMakeReservation={() => handleMakeReservation()}
        availableTablesCount={stats.available}
      />

      {/* Dialogs */}
      {showSeatDialog && (
        <SeatGuestDialog
          table={selectedTable}
          onClose={() => {
            setShowSeatDialog(false)
            setSelectedTable(null)
          }}
          onSuccess={() => {
            setShowSeatDialog(false)
            setSelectedTable(null)
            refetch()
            refetchReservations()
          }}
        />
      )}

      {showReservationDialog && (
        <ReservationDialog
          table={selectedTable}
          onClose={() => {
            setShowReservationDialog(false)
            setSelectedTable(null)
          }}
          onSuccess={() => {
            setShowReservationDialog(false)
            setSelectedTable(null)
            refetchReservations()
          }}
        />
      )}
    </div>
  )
}