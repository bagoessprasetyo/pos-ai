'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStoreSettings } from '@/hooks/use-store-settings'
import { useKitchenOrders } from '@/hooks/use-kitchen-orders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChefHat, Clock, AlertCircle, CheckCircle, Play, Pause } from 'lucide-react'
import { KitchenOrderStatus, KitchenOrderPriority } from '@/types'
import { usePermissions } from '@/hooks/use-permissions'

export default function KitchenDashboard() {
  const router = useRouter()
  const { kitchen_dashboard_enabled } = useStoreSettings()
  const { hasPermission } = usePermissions()
  const { orders, loading, updateOrderStatus, getOrdersByStatus } = useKitchenOrders()

  // Check if user has access to kitchen dashboard
  useEffect(() => {
    if (!kitchen_dashboard_enabled) {
      router.push('/dashboard')
      return
    }
    
    if (!hasPermission('kitchen', 'read')) {
      router.push('/dashboard')
      return
    }
  }, [kitchen_dashboard_enabled, hasPermission, router])

  // Don't render anything if kitchen dashboard is disabled or user doesn't have permission
  if (!kitchen_dashboard_enabled || !hasPermission('kitchen', 'read')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }


  const getStatusColor = (status: KitchenOrderStatus) => {
    switch (status) {
      case KitchenOrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800'
      case KitchenOrderStatus.PREPARING:
        return 'bg-blue-100 text-blue-800'
      case KitchenOrderStatus.READY:
        return 'bg-green-100 text-green-800'
      case KitchenOrderStatus.COMPLETED:
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: KitchenOrderPriority) => {
    switch (priority) {
      case KitchenOrderPriority.LOW:
        return 'bg-gray-100 text-gray-800'
      case KitchenOrderPriority.NORMAL:
        return 'bg-blue-100 text-blue-800'
      case KitchenOrderPriority.HIGH:
        return 'bg-orange-100 text-orange-800'
      case KitchenOrderPriority.URGENT:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: KitchenOrderStatus) => {
    await updateOrderStatus(orderId, { status: newStatus })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <ChefHat className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Kitchen Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Orders */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-yellow-600">Pending Orders</h2>
          {getOrdersByStatus(KitchenOrderStatus.PENDING).map(order => (
            <Card key={order.id} className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(order.priority)}>
                      {order.priority}
                    </Badge>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Items:</h4>
                    {order.transaction.transaction_items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.product.name}</span>
                        <span>Rp {item.line_total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  
                  {order.special_instructions && (
                    <div>
                      <h4 className="font-medium mb-1">Special Instructions:</h4>
                      <p className="text-sm text-muted-foreground">{order.special_instructions}</p>
                    </div>
                  )}
                  
                  {order.estimated_prep_time && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Est. {order.estimated_prep_time} min</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusChange(order.id, KitchenOrderStatus.PREPARING)}
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Start Preparing
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preparing Orders */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-600">Preparing Orders</h2>
          {getOrdersByStatus(KitchenOrderStatus.PREPARING).map(order => (
            <Card key={order.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Started: {order.started_at ? new Date(order.started_at).toLocaleTimeString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(order.priority)}>
                      {order.priority}
                    </Badge>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Items:</h4>
                    {order.transaction.transaction_items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.product.name}</span>
                        <span>Rp {item.line_total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  
                  {order.special_instructions && (
                    <div>
                      <h4 className="font-medium mb-1">Special Instructions:</h4>
                      <p className="text-sm text-muted-foreground">{order.special_instructions}</p>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(order.id, KitchenOrderStatus.PENDING)}
                      className="flex items-center gap-2"
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusChange(order.id, KitchenOrderStatus.READY)}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Ready
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ready Orders */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-green-600">Ready for Pickup</h2>
          {getOrdersByStatus(KitchenOrderStatus.READY).map(order => (
            <Card key={order.id} className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ready: {order.completed_at ? new Date(order.completed_at).toLocaleTimeString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(order.priority)}>
                      {order.priority}
                    </Badge>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Items:</h4>
                    {order.transaction.transaction_items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.product.name}</span>
                        <span>Rp {item.line_total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Ready for pickup</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}