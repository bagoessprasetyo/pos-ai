'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Bell, 
  X, 
  Calendar,
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter
} from 'lucide-react'
import { useForecasting, type ForecastAlert } from '@/hooks/use-forecasting'
import { formatPrice } from '@/utils/currency'
import { toast } from 'sonner'

interface ForecastAlertsProps {
  className?: string
  showHeader?: boolean
  maxAlerts?: number
}

const getAlertIcon = (type: ForecastAlert['type']) => {
  switch (type) {
    case 'opportunity':
      return <TrendingUp className="w-4 h-4" />
    case 'warning':
      return <AlertTriangle className="w-4 h-4" />
    case 'trend':
      return <TrendingDown className="w-4 h-4" />
    default:
      return <Bell className="w-4 h-4" />
  }
}

const getAlertColor = (type: ForecastAlert['type'], severity: ForecastAlert['severity']) => {
  const severityColors = {
    low: 'border-blue-200 bg-blue-50',
    medium: 'border-yellow-200 bg-yellow-50',
    high: 'border-red-200 bg-red-50'
  }
  
  const typeColors = {
    opportunity: 'text-green-600',
    warning: 'text-red-600',
    trend: 'text-blue-600'
  }
  
  return {
    card: severityColors[severity] || severityColors.low,
    text: typeColors[type] || typeColors.trend
  }
}

const getSeverityBadge = (severity: ForecastAlert['severity']) => {
  const colors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  }
  
  return colors[severity] || colors.low
}

export function ForecastAlerts({ 
  className = '',
  showHeader = true,
  maxAlerts 
}: ForecastAlertsProps) {
  const {
    alerts,
    loading,
    error,
    dismissAlert,
    hasAlerts,
    activeAlerts
  } = useForecasting()

  const [filter, setFilter] = useState<'all' | 'high' | 'opportunities' | 'warnings'>('all')

  const filteredAlerts = alerts
    .filter(alert => {
      switch (filter) {
        case 'high':
          return alert.severity === 'high'
        case 'opportunities':
          return alert.type === 'opportunity'
        case 'warnings':
          return alert.type === 'warning'
        default:
          return true
      }
    })
    .slice(0, maxAlerts || alerts.length)

  const handleDismissAlert = async (alertId: string) => {
    try {
      await dismissAlert(alertId)
      toast.success('Alert dismissed')
    } catch (error) {
      toast.error('Failed to dismiss alert')
    }
  }

  const alertCounts = {
    total: alerts.length,
    high: alerts.filter(a => a.severity === 'high').length,
    opportunities: alerts.filter(a => a.type === 'opportunity').length,
    warnings: alerts.filter(a => a.type === 'warning').length,
    active: activeAlerts.length
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load forecast alerts: {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showHeader && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Bell className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Forecast Alerts
                    <Badge variant="outline" className="text-xs">
                      {alertCounts.active} Active
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI-generated alerts based on sales forecasts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All ({alertCounts.total})
                </Button>
                <Button
                  variant={filter === 'high' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('high')}
                >
                  High ({alertCounts.high})
                </Button>
                <Button
                  variant={filter === 'opportunities' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('opportunities')}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Opportunities ({alertCounts.opportunities})
                </Button>
                <Button
                  variant={filter === 'warnings' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('warnings')}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Warnings ({alertCounts.warnings})
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const colors = getAlertColor(alert.type, alert.severity)
            const daysUntil = Math.ceil(
              (new Date(alert.forecast_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
            
            return (
              <Card key={alert.id} className={`${colors.card} border`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${colors.text}`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{alert.title}</h3>
                          <Badge className={getSeverityBadge(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {daysUntil > 0 ? `${daysUntil} days` : 'Today'}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            <span>Predicted: {formatPrice(alert.predicted_value)}</span>
                          </div>
                          {alert.threshold_value && (
                            <div className="flex items-center gap-1">
                              <span>Threshold: {formatPrice(alert.threshold_value)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>Confidence: {Math.round(alert.confidence_score * 100)}%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <Clock className="w-3 h-3" />
                          <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissAlert(alert.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No Active Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  {filter === 'all' 
                    ? 'All forecast alerts have been addressed'
                    : `No alerts match the current filter: ${filter}`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Loading alerts...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}