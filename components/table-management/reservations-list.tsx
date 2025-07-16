'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus,
  Phone,
  MapPin,
  MoreVertical,
  CheckCircle,
  XCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TableReservation, ReservationStatus } from '@/types'

interface ReservationsListProps {
  reservations: TableReservation[]
  onMakeReservation: () => void
}

export function ReservationsList({ 
  reservations, 
  onMakeReservation 
}: ReservationsListProps) {
  
  // Get status info
  const getStatusInfo = (status: ReservationStatus) => {
    switch (status) {
      case 'confirmed':
        return { 
          color: 'bg-green-100 text-green-800', 
          icon: CheckCircle,
          label: 'Confirmed' 
        }
      case 'pending':
        return { 
          color: 'bg-yellow-100 text-yellow-800', 
          icon: Clock,
          label: 'Pending' 
        }
      case 'cancelled':
        return { 
          color: 'bg-red-100 text-red-800', 
          icon: XCircle,
          label: 'Cancelled' 
        }
      case 'seated':
        return { 
          color: 'bg-blue-100 text-blue-800', 
          icon: Users,
          label: 'Seated' 
        }
      case 'no_show':
        return { 
          color: 'bg-gray-100 text-gray-800', 
          icon: XCircle,
          label: 'No Show' 
        }
      default:
        return { 
          color: 'bg-gray-100 text-gray-800', 
          icon: Calendar,
          label: 'Unknown' 
        }
    }
  }

  // Group reservations by date
  const groupedReservations = reservations.reduce((acc, reservation) => {
    const date = new Date(reservation.reservation_time).toDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(reservation)
    return acc
  }, {} as Record<string, TableReservation[]>)

  // Sort dates
  const sortedDates = Object.keys(groupedReservations).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  )

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Reservations</h3>
          <p className="text-sm text-muted-foreground">
            Manage table reservations and bookings
          </p>
        </div>
        <Button onClick={onMakeReservation}>
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      {/* Reservations */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-medium mb-2">No reservations found</h3>
          <p className="text-sm mb-4">
            No reservations match your current filters.
          </p>
          <Button onClick={onMakeReservation} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create First Reservation
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => {
            const dayReservations = groupedReservations[date]
              .sort((a, b) => new Date(a.reservation_time).getTime() - new Date(b.reservation_time).getTime())

            return (
              <div key={date}>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(date)}
                  <Badge variant="secondary" className="text-xs">
                    {dayReservations.length} reservations
                  </Badge>
                </h4>
                
                <div className="space-y-3">
                  {dayReservations.map(reservation => {
                    const statusInfo = getStatusInfo(reservation.status as ReservationStatus)
                    const StatusIcon = statusInfo.icon

                    return (
                      <Card key={reservation.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Time and Party Size */}
                              <div className="flex items-center gap-4 mb-2">
                                <div className="flex items-center gap-1 font-medium">
                                  <Clock className="h-4 w-4" />
                                  {formatTime(reservation.reservation_time)}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  Party of {reservation.party_size}
                                </div>
                                <Badge className={`text-xs ${statusInfo.color}`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusInfo.label}
                                </Badge>
                              </div>

                              {/* Customer Info */}
                              <div className="space-y-1">
                                <div className="font-medium">{reservation.customer_name}</div>
                                {reservation.customer_phone && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    {reservation.customer_phone}
                                  </div>
                                )}
                                {/* {reservation.tables && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    Table {reservation.tables.table_number}
                                    {reservation.tables.table_areas && (
                                      <span>in {reservation.tables.table_areas.name}</span>
                                    )}
                                  </div>
                                )} */}
                              </div>

                              {/* Notes */}
                              {reservation.notes && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {reservation.notes}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {reservation.status === 'confirmed' && (
                                  <DropdownMenuItem>
                                    <Users className="h-4 w-4 mr-2" />
                                    Seat Now
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Phone className="h-4 w-4 mr-2" />
                                  Call Customer
                                </DropdownMenuItem>
                                {reservation.status !== 'cancelled' && (
                                  <DropdownMenuItem className="text-red-600">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel Reservation
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}