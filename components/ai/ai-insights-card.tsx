'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Star,
  Clock
} from 'lucide-react'
import type { BusinessInsight } from '@/hooks/use-ai-insights'

interface AIInsightsCardProps {
  insight: BusinessInsight
  onActionClick?: (action: string) => void
}

const getInsightIcon = (type: BusinessInsight['type']) => {
  switch (type) {
    case 'opportunity':
      return <TrendingUp className="w-4 h-4" />
    case 'warning':
      return <AlertTriangle className="w-4 h-4" />
    case 'trend':
      return <TrendingDown className="w-4 h-4" />
    case 'optimization':
      return <Target className="w-4 h-4" />
    default:
      return <Lightbulb className="w-4 h-4" />
  }
}

const getInsightColor = (type: BusinessInsight['type']) => {
  switch (type) {
    case 'opportunity':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'warning':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'trend':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'optimization':
      return 'text-purple-600 bg-purple-50 border-purple-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const getPriorityColor = (priority: BusinessInsight['priority']) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getConfidenceStars = (score: number) => {
  const stars = Math.round(score * 5)
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`w-3 h-3 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
    />
  ))
}

export function AIInsightsCard({ insight, onActionClick }: AIInsightsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className={`hover:shadow-md transition-all duration-200 border ${getInsightColor(insight.type)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${getInsightColor(insight.type)}`}>
              {getInsightIcon(insight.type)}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold leading-tight">
                {insight.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getPriorityColor(insight.priority)}`}
                >
                  {insight.priority.toUpperCase()} PRIORITY
                </Badge>
                <div className="flex items-center gap-1">
                  {getConfidenceStars(insight.confidence_score)}
                  <span className="text-xs text-muted-foreground ml-1">
                    {Math.round(insight.confidence_score * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">
          {insight.description}
        </p>

        {isExpanded && (
          <div className="space-y-4">
            {/* Potential Impact */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                <Target className="w-3 h-3" />
                Potential Impact
              </h4>
              <p className="text-sm text-muted-foreground">
                {insight.potential_impact}
              </p>
            </div>

            {/* Action Steps */}
            {insight.actionable_steps && insight.actionable_steps.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Brain className="w-3 h-3" />
                  Recommended Actions
                </h4>
                <ul className="space-y-2">
                  {insight.actionable_steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {insight.actionable_steps?.slice(0, 2).map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onActionClick?.(action)}
                  className="text-xs"
                >
                  {action.length > 30 ? `${action.substring(0, 30)}...` : action}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Generated timestamp */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            AI-generated insight
          </span>
        </div>
      </CardContent>
    </Card>
  )
}