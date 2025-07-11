'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/contexts/store-context'
import { supabase } from '@/lib/supabase'

export interface ForecastData {
  date: string
  predicted_sales: number
  predicted_transactions: number
  confidence_interval: {
    lower: number
    upper: number
  }
  actual_sales?: number
  actual_transactions?: number
}

export interface ForecastAlert {
  id: string
  type: 'opportunity' | 'warning' | 'trend'
  title: string
  message: string
  severity: 'low' | 'medium' | 'high'
  forecast_date: string
  predicted_value: number
  threshold_value?: number
  confidence_score: number
  dismissed: boolean
  created_at: string
}

export interface ForecastInsight {
  period: string
  growth_rate: number
  seasonality_pattern: string
  peak_days: string[]
  recommended_actions: string[]
  accuracy_score: number
}

export function useForecasting() {
  const { currentStore } = useStore()
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [alerts, setAlerts] = useState<ForecastAlert[]>([])
  const [insights, setInsights] = useState<ForecastInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate sales forecast using AI
  const generateForecast = useCallback(async (days: number = 30) => {
    if (!currentStore) {
      setError('No store selected')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get historical sales data
      const { data: salesData, error: salesError } = await supabase
        .from('transactions')
        .select('created_at, total')
        .eq('store_id', currentStore.id)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })

      if (salesError) throw salesError

      // Call AI forecasting API
      const response = await fetch('/api/ai/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: currentStore.id,
          historical_data: salesData,
          forecast_days: days
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || 'Failed to generate forecast')
      }

      const forecastData = await response.json()
      setForecasts(forecastData.forecasts)
      setInsights(forecastData.insights)
      
      // Generate alerts based on forecast
      await generateAlerts(forecastData.forecasts)
      
    } catch (err) {
      console.error('Error generating forecast:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [currentStore])

  // Generate alerts from forecast data
  const generateAlerts = useCallback(async (forecastData: ForecastData[]) => {
    if (!currentStore) return

    try {
      const response = await fetch('/api/ai/forecast-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: currentStore.id,
          forecasts: forecastData
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate alerts')
      }

      const alertData = await response.json()
      setAlerts(alertData.alerts)
      
    } catch (err) {
      console.error('Error generating alerts:', err)
    }
  }, [currentStore])

  // Load existing alerts
  const loadAlerts = useCallback(async () => {
    if (!currentStore) return

    try {
      const { data, error } = await supabase
        .from('forecast_alerts')
        .select('*')
        .eq('store_id', currentStore.id)
        .gte('forecast_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })

      if (error) throw error
      setAlerts(data || [])
    } catch (err) {
      console.error('Error loading alerts:', err)
    }
  }, [currentStore])

  // Dismiss alert
  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('forecast_alerts')
        .update({ dismissed: true })
        .eq('id', alertId)

      if (error) throw error
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
    } catch (err) {
      console.error('Error dismissing alert:', err)
    }
  }, [])

  // Get forecast accuracy
  const getForecastAccuracy = useCallback(async () => {
    if (!currentStore) return 0

    try {
      const { data, error } = await supabase
        .from('forecast_accuracy')
        .select('accuracy_score')
        .eq('store_id', currentStore.id)
        .order('calculated_at', { ascending: false })
        .limit(1)

      if (error) throw error
      return data?.[0]?.accuracy_score || 0
    } catch (err) {
      console.error('Error getting forecast accuracy:', err)
      return 0
    }
  }, [currentStore])

  // Calculate forecast trends
  const calculateTrends = useCallback((forecastData: ForecastData[]) => {
    if (forecastData.length < 7) return null

    const weeklyTrends = []
    for (let i = 0; i < forecastData.length - 6; i += 7) {
      const weekData = forecastData.slice(i, i + 7)
      const weekTotal = weekData.reduce((sum, day) => sum + day.predicted_sales, 0)
      weeklyTrends.push(weekTotal)
    }

    if (weeklyTrends.length < 2) return null

    const growthRate = ((weeklyTrends[weeklyTrends.length - 1] - weeklyTrends[0]) / weeklyTrends[0]) * 100
    
    return {
      weeklyTrends,
      growthRate,
      isGrowing: growthRate > 0,
      volatility: calculateVolatility(weeklyTrends)
    }
  }, [])

  const calculateVolatility = (values: number[]) => {
    if (values.length < 2) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance) / mean * 100
  }

  // Auto-load data when store changes
  useEffect(() => {
    if (currentStore) {
      loadAlerts()
    }
  }, [currentStore, loadAlerts])

  return {
    forecasts,
    alerts,
    insights,
    loading,
    error,
    generateForecast,
    dismissAlert,
    getForecastAccuracy,
    calculateTrends,
    hasForecasts: forecasts.length > 0,
    hasAlerts: alerts.length > 0,
    activeAlerts: alerts.filter(alert => !alert.dismissed && new Date(alert.forecast_date) >= new Date())
  }
}