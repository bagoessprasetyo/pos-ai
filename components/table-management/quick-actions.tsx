'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UserPlus, Calendar, Clock, Users } from 'lucide-react'

interface QuickActionsProps {
  onSeatWalkIn: () => void
  onMakeReservation: () => void
  availableTablesCount: number
}

export function QuickActions({ 
  onSeatWalkIn, 
  onMakeReservation, 
  availableTablesCount 
}: QuickActionsProps) {
  return (
    <div className="border-t bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Seat Walk-in */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Button
                onClick={onSeatWalkIn}
                disabled={availableTablesCount === 0}
                className="w-full h-auto flex-col gap-2 py-4"
                variant={availableTablesCount > 0 ? 'default' : 'secondary'}
              >
                <UserPlus className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Seat Walk-in</div>
                  <div className="text-xs opacity-75">
                    {availableTablesCount > 0 
                      ? `${availableTablesCount} tables available`
                      : 'No tables available'
                    }
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Make Reservation */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Button
                onClick={onMakeReservation}
                className="w-full h-auto flex-col gap-2 py-4"
                variant="outline"
              >
                <Calendar className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Make Reservation</div>
                  <div className="text-xs opacity-75">
                    Schedule future seating
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Available Now</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {availableTablesCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    tables ready for seating
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}