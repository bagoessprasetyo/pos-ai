'use client'

import React, { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/utils/currency'
import type { ProductWithCategory, CartItem } from '@/types'

interface ProductCardProps {
  product: ProductWithCategory
  isInCart: boolean
  cartQuantity?: number
  onAddToCart: (product: ProductWithCategory) => void
}

export const ProductCard = memo(function ProductCard({
  product,
  isInCart,
  cartQuantity = 0,
  onAddToCart
}: ProductCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 h-[160px] md:h-[140px] w-full flex flex-col relative active:scale-95 ${
        isInCart 
          ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-200' 
          : 'hover:shadow-md border-border'
      }`}
      onClick={() => onAddToCart(product)}
    >
      {/* Selection Indicator */}
      {isInCart && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-green-500 text-white rounded-full flex items-center justify-center min-w-[24px] h-6 px-2">
            <span className="text-xs font-bold">{cartQuantity}</span>
          </div>
        </div>
      )}
      
      <CardContent className="p-3 md:p-4 flex flex-col h-full justify-between overflow-hidden">
        <div className="flex-1 flex items-center justify-center min-h-0">
          <h3 className="text-center font-medium text-sm md:text-sm leading-tight line-clamp-2 overflow-hidden text-ellipsis">
            {product.name}
          </h3>
        </div>
        
        <div className="mt-2 space-y-1 flex-shrink-0">
          <div className="text-center">
            <div className="text-base md:text-base font-bold text-primary">
              {formatPrice(product.price)}
            </div>
          </div>
          
          {/* Desktop only details */}
          <div className="hidden md:block space-y-1">
            {product.category && (
              <Badge variant="outline" className="text-xs">
                {product.category.name}
              </Badge>
            )}
            
            {product.sku && (
              <div className="text-xs text-muted-foreground truncate">
                SKU: {product.sku}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

ProductCard.displayName = 'ProductCard'