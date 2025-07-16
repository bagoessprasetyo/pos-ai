'use client'

import { InventoryOptimizer } from '@/components/ai/inventory-optimizer'
import { Package, Brain, Sparkles, BarChart3 } from 'lucide-react'

export default function InventoryOptimizationPage() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              Inventory Optimization
              <Brain className="h-5 w-5 text-purple-500" />
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered inventory analysis and optimization recommendations
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span>Real-time Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <InventoryOptimizer />
      </div>
    </div>
  )
}