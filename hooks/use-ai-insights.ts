'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/contexts/store-context'
import { useAnalytics } from './use-analytics'

export interface BusinessInsight {
  title: string
  description: string
  type: 'opportunity' | 'warning' | 'trend' | 'optimization'
  priority: 'high' | 'medium' | 'low'
  actionable_steps: string[]
  potential_impact: string
  confidence_score: number
}

export interface AIInsightsData {
  insights: BusinessInsight[]
  generated_at: string
  store_id: string
}

export function useAIInsights() {
  const [insights, setInsights] = useState<BusinessInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)
  
  const { currentStore } = useStore()
  const { analytics } = useAnalytics()

  // Cache insights for 1 hour to avoid excessive API calls
  const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

  const generateInsights = useCallback(async (forceRefresh = false) => {
    if (!currentStore?.id || !analytics) {
      setError('Store or analytics data not available')
      return
    }

    // Check cache unless force refresh
    if (!forceRefresh && lastGenerated) {
      const timeSinceLastGeneration = Date.now() - lastGenerated.getTime()
      if (timeSinceLastGeneration < CACHE_DURATION) {
        console.log('Using cached insights')
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: currentStore.id,
          analytics_data: {
            todaysSales: analytics.todaysSales,
            todaysTransactions: analytics.todaysTransactions,
            todaysItemsSold: analytics.todaysItemsSold,
            avgTransactionValue: analytics.avgTransactionValue,
            weekSales: analytics.weekSales,
            monthSales: analytics.monthSales,
            salesTrend: analytics.salesTrend,
          },
          top_products: analytics.topProducts,
          category_performance: analytics.categoryPerformance,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate insights: ${response.statusText}`)
      }

      const data: AIInsightsData = await response.json()
      setInsights(data.insights)
      setLastGenerated(new Date())
      
      // Cache insights in localStorage
      try {
        localStorage.setItem(
          `ai-insights-${currentStore.id}`,
          JSON.stringify({
            insights: data.insights,
            generated_at: new Date().toISOString(),
          })
        )
      } catch (cacheError) {
        console.warn('Failed to cache insights:', cacheError)
      }

    } catch (err) {
      console.error('Error generating AI insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate insights')
      
      // Try to load cached insights as fallback
      try {
        const cached = localStorage.getItem(`ai-insights-${currentStore.id}`)
        if (cached) {
          const cachedData = JSON.parse(cached)
          setInsights(cachedData.insights)
          setError('Using cached insights - AI service temporarily unavailable')
        }
      } catch (cacheError) {
        console.warn('Failed to load cached insights:', cacheError)
      }
    } finally {
      setLoading(false)
    }
  }, [currentStore?.id, analytics, lastGenerated])

  // Load cached insights on mount
  useEffect(() => {
    if (currentStore?.id) {
      try {
        const cached = localStorage.getItem(`ai-insights-${currentStore.id}`)
        if (cached) {
          const cachedData = JSON.parse(cached)
          const cacheAge = Date.now() - new Date(cachedData.generated_at).getTime()
          
          if (cacheAge < CACHE_DURATION) {
            setInsights(cachedData.insights)
            setLastGenerated(new Date(cachedData.generated_at))
          }
        }
      } catch (error) {
        console.warn('Failed to load cached insights:', error)
      }
    }
  }, [currentStore?.id])

  // Auto-generate insights when analytics data is available
  useEffect(() => {
    if (analytics?.todaysSales !== undefined && insights.length === 0 && !loading) {
      generateInsights()
    }
  }, [analytics, insights.length, loading, generateInsights])

  const clearInsights = useCallback(() => {
    setInsights([])
    setLastGenerated(null)
    if (currentStore?.id) {
      localStorage.removeItem(`ai-insights-${currentStore.id}`)
    }
  }, [currentStore?.id])

  const getInsightsByType = useCallback((type: BusinessInsight['type']) => {
    return insights.filter(insight => insight.type === type)
  }, [insights])

  const getInsightsByPriority = useCallback((priority: BusinessInsight['priority']) => {
    return insights.filter(insight => insight.priority === priority)
  }, [insights])

  const getHighConfidenceInsights = useCallback((minConfidence = 0.7) => {
    return insights.filter(insight => insight.confidence_score >= minConfidence)
  }, [insights])

  return {
    insights,
    loading,
    error,
    lastGenerated,
    generateInsights,
    clearInsights,
    getInsightsByType,
    getInsightsByPriority,
    getHighConfidenceInsights,
    hasInsights: insights.length > 0,
    isStale: lastGenerated ? (Date.now() - lastGenerated.getTime()) > CACHE_DURATION : true,
  }
}