'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain, 
  RefreshCw, 
  Filter,
  TrendingUp,
  AlertTriangle,
  Target,
  Lightbulb,
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { useAIInsights } from '@/hooks/use-ai-insights'
import { AIInsightsCard } from './ai-insights-card'
import { toast } from 'sonner'

export function BusinessInsights() {
  const {
    insights,
    loading,
    error,
    generateInsights,
    getInsightsByType,
    getInsightsByPriority,
    getHighConfidenceInsights,
    hasInsights,
    isStale,
    lastGenerated
  } = useAIInsights()

  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'opportunities' | 'warnings'>('all')

  const handleRefresh = async () => {
    try {
      await generateInsights(true)
      toast.success('AI insights refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh insights')
    }
  }

  const handleActionClick = (action: string) => {
    // Here you could implement specific actions based on the insight
    toast.info(`Action noted: ${action}`)
  }

  const getFilteredInsights = () => {
    switch (activeFilter) {
      case 'high':
        return getInsightsByPriority('high')
      case 'opportunities':
        return getInsightsByType('opportunity')
      case 'warnings':
        return getInsightsByType('warning')
      default:
        return insights
    }
  }

  const filteredInsights = getFilteredInsights()

  const insightCounts = {
    opportunities: getInsightsByType('opportunity').length,
    warnings: getInsightsByType('warning').length,
    trends: getInsightsByType('trend').length,
    optimizations: getInsightsByType('optimization').length,
    high_priority: getInsightsByPriority('high').length,
    high_confidence: getHighConfidenceInsights().length,
  }

  if (error && !hasInsights) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">AI Insights Unavailable</h3>
              <p className="text-sm text-red-600/80">{error}</p>
            </div>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="mt-3"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  AI Business Insights
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {hasInsights 
                    ? `${insights.length} intelligent insights generated`
                    : 'Get AI-powered business insights'
                  }
                  {lastGenerated && (
                    <span className="ml-2">
                      • Last updated {new Date(lastGenerated).toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isStale && hasInsights && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                  Insights may be outdated
                </Badge>
              )}
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {loading ? 'Generating...' : 'Refresh Insights'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Quick Stats */}
        {hasInsights && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">{insightCounts.opportunities}</div>
                <div className="text-xs text-green-600">Opportunities</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">{insightCounts.warnings}</div>
                <div className="text-xs text-red-600">Warnings</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{insightCounts.trends}</div>
                <div className="text-xs text-blue-600">Trends</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{insightCounts.optimizations}</div>
                <div className="text-xs text-purple-600">Optimizations</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">{insightCounts.high_priority}</div>
                <div className="text-xs text-orange-600">High Priority</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-bold text-yellow-600">{insightCounts.high_confidence}</div>
                <div className="text-xs text-yellow-600">High Confidence</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Insights Content */}
      {loading && !hasInsights ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <h3 className="font-semibold mb-2">Generating AI Insights</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Our AI is analyzing your business data to provide personalized insights and recommendations. This may take a moment.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : hasInsights ? (
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
            >
              All Insights ({insights.length})
            </Button>
            <Button
              variant={activeFilter === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('high')}
            >
              High Priority ({insightCounts.high_priority})
            </Button>
            <Button
              variant={activeFilter === 'opportunities' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('opportunities')}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Opportunities ({insightCounts.opportunities})
            </Button>
            <Button
              variant={activeFilter === 'warnings' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('warnings')}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Warnings ({insightCounts.warnings})
            </Button>
          </div>

          {/* Insights Grid */}
          {filteredInsights.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredInsights.map((insight, index) => (
                <AIInsightsCard
                  key={index}
                  insight={insight}
                  onActionClick={handleActionClick}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No insights for this filter</h3>
                <p className="text-sm text-muted-foreground">
                  Try a different filter or refresh insights to see more recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Ready to generate insights</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Get AI-powered insights about your business performance, opportunities, and optimization recommendations.
            </p>
            <Button onClick={handleRefresh} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate AI Insights
            </Button>
          </CardContent>
        </Card>
      )}

      {error && hasInsights && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}