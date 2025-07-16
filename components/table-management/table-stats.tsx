'use client'

import { Card, CardContent } from '@/components/ui/card'
import { 
  TableProperties, 
  Users, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Utensils
} from 'lucide-react'

interface TableStatsProps {
  stats: {
    total: number
    available: number
    occupied: number
    reserved: number
    cleaning: number
    out_of_service: number
  }
  upcomingReservations: number
  activeSessions: number
}

export function TableStats({ stats, upcomingReservations, activeSessions }: TableStatsProps) {
  const statCards = [
    {
      title: 'Total Tables',
      value: stats.total,
      icon: TableProperties,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Available',
      value: stats.available,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Occupied',
      value: stats.occupied,
      icon: Users,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Reserved',
      value: stats.reserved,
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Cleaning',
      value: stats.cleaning,
      icon: AlertCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Out of Service',
      value: stats.out_of_service,
      icon: XCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ]

  const additionalStats = [
    {
      title: 'Upcoming Reservations',
      value: upcomingReservations,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Active Sessions',
      value: activeSessions,
      icon: Utensils,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {stat.title}
                  </p>
                  <p className="text-lg font-bold">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
      
      {additionalStats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {stat.title}
                  </p>
                  <p className="text-lg font-bold">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}