'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Plus, 
  TrendingUp, 
  Package, 
  Star,
  Loader2,
  ShoppingCart,
  Brain,
  X
} from 'lucide-react'
import { useRecommendations, type ProductRecommendation, type CartItem } from '@/hooks/use-recommendations'
import { formatPrice } from '@/utils/currency'
import { toast } from 'sonner'

interface RecommendationWidgetProps {
  cartItems: CartItem[]
  onAddToCart: (productId: string, productName: string) => void
  className?: string
  compact?: boolean
}

const getRecommendationIcon = (type: ProductRecommendation['type']) => {
  switch (type) {
    case 'cross_sell':
      return <Package className="w-3 h-3" />
    case 'upsell':
      return <TrendingUp className="w-3 h-3" />
    case 'bundle':
      return <ShoppingCart className="w-3 h-3" />
    case 'trending':
      return <Star className="w-3 h-3" />
    default:
      return <Sparkles className="w-3 h-3" />
  }
}

const getRecommendationColor = (type: ProductRecommendation['type']) => {
  switch (type) {
    case 'cross_sell':
      return 'bg-blue-50 text-blue-600 border-blue-200'
    case 'upsell':
      return 'bg-green-50 text-green-600 border-green-200'
    case 'bundle':
      return 'bg-purple-50 text-purple-600 border-purple-200'
    case 'trending':
      return 'bg-yellow-50 text-yellow-600 border-yellow-200'
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

const getRecommendationLabel = (type: ProductRecommendation['type']) => {
  switch (type) {
    case 'cross_sell':
      return 'Perfect Match'
    case 'upsell':
      return 'Upgrade Option'
    case 'bundle':
      return 'Bundle Deal'
    case 'trending':
      return 'Trending Now'
    default:
      return 'Recommended'
  }
}

export function RecommendationWidget({ 
  cartItems, 
  onAddToCart, 
  className = '',
  compact = false 
}: RecommendationWidgetProps) {
  const {
    recommendations,
    loading,
    error,
    getRecommendations,
    trackRecommendationClick,
    trackRecommendationPurchase,
    calculatePotentialIncrease,
    hasRecommendations
  } = useRecommendations()

  const [isVisible, setIsVisible] = useState(true)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)

  // Get recommendations when cart changes
  useEffect(() => {
    if (cartItems.length > 0) {
      setLoadingRecommendations(true)
      getRecommendations(cartItems)
        .finally(() => setLoadingRecommendations(false))
    }
  }, [cartItems, getRecommendations])

  const handleAddToCart = async (recommendation: ProductRecommendation) => {
    try {
      // Track the click
      await trackRecommendationClick(recommendation, cartItems)
      
      // Add to cart
      onAddToCart(recommendation.product_id, recommendation.product_name)
      
      // Track the purchase
      await trackRecommendationPurchase(recommendation, cartItems)
      
      toast.success(`Added ${recommendation.product_name} to cart`)
    } catch (error) {
      console.error('Failed to add recommendation to cart:', error)
      toast.error('Failed to add item to cart')
    }
  }

  const potentialIncrease = calculatePotentialIncrease()

  // Don't show widget if no cart items or no recommendations
  if (cartItems.length === 0 || (!hasRecommendations && !loadingRecommendations) || !isVisible) {
    return null
  }

  if (compact) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              AI Suggestions
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingRecommendations ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground ml-2">Getting suggestions...</span>
            </div>
          ) : hasRecommendations ? (
            <div className="space-y-2">
              {recommendations.slice(0, 2).map((rec, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{rec.product_name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(rec.price || 0)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(rec)}
                    className="ml-2 h-6 px-2 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {recommendations.length > 2 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{recommendations.length - 2} more suggestions
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Recommendations
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {potentialIncrease > 0 && (
          <p className="text-sm text-muted-foreground">
            Add recommended items to increase order value by {formatPrice(potentialIncrease)}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        {loadingRecommendations ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Getting personalized recommendations...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Unable to load recommendations</p>
          </div>
        ) : hasRecommendations ? (
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm">{recommendation.product_name}</h4>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getRecommendationColor(recommendation.type)}`}
                      >
                        {getRecommendationIcon(recommendation.type)}
                        <span className="ml-1">{getRecommendationLabel(recommendation.type)}</span>
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {recommendation.reason}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {formatPrice(recommendation.price || 0)}
                      </span>
                      {recommendation.category && (
                        <Badge variant="secondary" className="text-xs">
                          {recommendation.category}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.round(recommendation.confidence_score * 5)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">
                          {Math.round(recommendation.confidence_score * 100)}%
                        </span>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(recommendation)}
                        className="h-7 px-3 text-xs gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {recommendations.length === 0 && (
              <div className="text-center py-6">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No recommendations available for current cart items
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Add items to your cart to see AI-powered recommendations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}