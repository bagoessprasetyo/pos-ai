'use client'

import { useState } from 'react'
import { useDiscounts } from '@/hooks/use-discounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Percent, 
  DollarSign, 
  Gift,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { DiscountDialog } from '@/components/forms/discount-dialog'
import { formatPrice } from '@/utils/currency'
import { toast } from 'sonner'
import type { Discount } from '@/types'

export default function DiscountsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')
  
  const { discounts, loading, deleteDiscount } = useDiscounts()

  // Filter discounts based on search and status
  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = !searchQuery || 
      discount.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      discount.code?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    const now = new Date()
    const isExpired = discount.end_date && new Date(discount.end_date) < now
    const isActive = discount.is_active && !isExpired

    switch (filterStatus) {
      case 'active':
        return isActive
      case 'inactive':
        return !discount.is_active
      case 'expired':
        return isExpired
      default:
        return true
    }
  })

  const handleDeleteDiscount = async (discountId: string) => {
    if (confirm('Are you sure you want to delete this discount?')) {
      try {
        await deleteDiscount(discountId)
        toast.success('Discount deleted successfully')
      } catch (error) {
        console.error('Error deleting discount:', error)
        toast.error('Failed to delete discount')
      }
    }
  }

  const getDiscountTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="h-4 w-4" />
      case 'fixed_amount':
        return <DollarSign className="h-4 w-4" />
      case 'buy_x_get_y':
        return <Gift className="h-4 w-4" />
      default:
        return <Percent className="h-4 w-4" />
    }
  }

  const getDiscountStatus = (discount: Discount) => {
    const now = new Date()
    
    if (!discount.is_active) {
      return { status: 'inactive', label: 'Inactive', variant: 'secondary' as const }
    }
    
    if (discount.start_date && new Date(discount.start_date) > now) {
      return { status: 'scheduled', label: 'Scheduled', variant: 'outline' as const }
    }
    
    if (discount.end_date && new Date(discount.end_date) < now) {
      return { status: 'expired', label: 'Expired', variant: 'destructive' as const }
    }
    
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return { status: 'limit_reached', label: 'Limit Reached', variant: 'destructive' as const }
    }
    
    return { status: 'active', label: 'Active', variant: 'default' as const }
  }

  const formatDiscountValue = (discount: Discount) => {
    switch (discount.type) {
      case 'percentage':
        return `${discount.value}%`
      case 'fixed_amount':
        return formatPrice(discount.value)
      case 'buy_x_get_y':
        const conditions = discount.conditions as any
        return `Buy ${discount.value}, Get ${conditions?.get_quantity || 1}`
      default:
        return discount.value.toString()
    }
  }

  const getUsageStats = (discount: Discount) => {
    if (discount.usage_limit) {
      const percentage = (discount.usage_count / discount.usage_limit) * 100
      return {
        used: discount.usage_count,
        total: discount.usage_limit,
        percentage: Math.round(percentage)
      }
    }
    return {
      used: discount.usage_count,
      total: null,
      percentage: null
    }
  }

  if (loading) {
    return <div>Loading discounts...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discounts & Promotions</h1>
          <p className="text-muted-foreground">
            Manage discount codes, promotions, and pricing rules
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Discount
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search discounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Discounts</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discounts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {discounts.filter(d => getDiscountStatus(d).status === 'active').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {discounts.filter(d => getDiscountStatus(d).status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {discounts.filter(d => getDiscountStatus(d).status === 'expired').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discounts List */}
      {filteredDiscounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <Gift className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No discounts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first discount to boost sales'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Discount
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDiscounts.map(discount => {
            const status = getDiscountStatus(discount)
            const usage = getUsageStats(discount)
            
            return (
              <Card key={discount.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getDiscountTypeIcon(discount.type)}
                        <CardTitle className="text-lg">{discount.name}</CardTitle>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      
                      {discount.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {discount.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="font-medium">
                          {formatDiscountValue(discount)} off
                        </span>
                        
                        {discount.applicable_to !== 'all' && (
                          <Badge variant="outline">
                            {discount.applicable_to === 'products' ? 'Specific Products' : 'Specific Categories'}
                          </Badge>
                        )}
                        
                        {discount.code && (
                          <Badge variant="outline">
                            Code: {discount.code}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingDiscount(discount)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteDiscount(discount.id)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {/* Date Range */}
                    <div>
                      <p className="text-muted-foreground mb-1">Date Range</p>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {discount.start_date 
                            ? new Date(discount.start_date).toLocaleDateString() 
                            : 'No start'
                          } - {discount.end_date 
                            ? new Date(discount.end_date).toLocaleDateString() 
                            : 'No end'
                          }
                        </span>
                      </div>
                    </div>
                    
                    {/* Usage Stats */}
                    <div>
                      <p className="text-muted-foreground mb-1">Usage</p>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>
                          {usage.used} {usage.total ? `/ ${usage.total}` : 'times'}
                          {usage.percentage !== null && (
                            <span className="ml-1 text-muted-foreground">
                              ({usage.percentage}%)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    {/* Conditions */}
                    <div>
                      <p className="text-muted-foreground mb-1">Conditions</p>
                      <div className="text-xs">
                        {(() => {
                          const conditions = discount.conditions as any || {}
                          const conditionsList = []
                          
                          if (conditions.minimum_purchase) {
                            conditionsList.push(`Min: ${formatPrice(conditions.minimum_purchase)}`)
                          }
                          if (conditions.maximum_discount) {
                            conditionsList.push(`Max: ${formatPrice(conditions.maximum_discount)}`)
                          }
                          
                          return conditionsList.length > 0 
                            ? conditionsList.join(', ')
                            : 'No conditions'
                        })()}
                      </div>
                    </div>
                    
                    {/* Applied To */}
                    <div>
                      <p className="text-muted-foreground mb-1">Applied To</p>
                      <div className="text-xs">
                        {discount.applicable_to === 'all' 
                          ? 'All products' 
                          : `${discount.applicable_ids.length} ${discount.applicable_to}`
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Usage Progress Bar */}
                  {usage.total && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Usage Progress</span>
                        <span>{usage.used} / {usage.total}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(usage.percentage || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Discount Dialog */}
      <DiscountDialog
        open={showCreateDialog || !!editingDiscount}
        onClose={() => {
          setShowCreateDialog(false)
          setEditingDiscount(null)
        }}
        discount={editingDiscount}
      />
    </div>
  )
}