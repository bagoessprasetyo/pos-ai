'use client'

import { useState } from 'react'
import { useKitchenOrders } from '@/hooks/use-kitchen-orders'
import { useStoreSettings } from '@/hooks/use-store-settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Bell, CheckCircle, Search, Clock, User } from 'lucide-react'
import { KitchenOrderStatus } from '@/types'
import { formatPrice } from '@/utils/currency'

export function PickupOrders() {
  const { kitchen_dashboard_enabled } = useStoreSettings()
  const { orders, completeOrder, loading } = useKitchenOrders()
  const [searchQuery, setSearchQuery] = useState('')

  // Only show pickup interface if kitchen dashboard is enabled
  if (!kitchen_dashboard_enabled) {
    return null
  }

  // Filter ready orders
  const readyOrders = orders.filter(order => order.status === KitchenOrderStatus.READY)

  // Filter orders based on search query
  const filteredOrders = searchQuery
    ? readyOrders.filter(order => 
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.transaction.transaction_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : readyOrders

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await completeOrder(orderId)
      // Show success message or play sound
      const audio = new Audio('/sounds/order-complete.mp3')
      audio.play().catch(() => {
        // Fallback to system beep if audio file not found
        console.log('Order completed successfully')
      })
    } catch (error) {
      console.error('Failed to complete order:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold">Ready for Pickup</h2>
          {readyOrders.length > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {readyOrders.length}
            </Badge>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders ready for pickup</h3>
              <p className="text-gray-500">
                {searchQuery ? 'No orders found matching your search.' : 'All orders have been completed.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Transaction: {order.transaction.transaction_number}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    Ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Customer Info */}
                  {order.transaction.customer_id && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>Customer Order</span>
                    </div>
                  )}
                  
                  {/* Order Items */}
                  <div>
                    <h4 className="font-medium mb-2">Items:</h4>
                    <div className="space-y-1">
                      {order.transaction.transaction_items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.product.name}</span>
                          <span>{formatPrice(item.line_total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Order Total */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-lg">{formatPrice(order.transaction.total)}</span>
                  </div>
                  
                  {/* Special Instructions */}
                  {order.special_instructions && (
                    <div>
                      <h4 className="font-medium mb-1">Special Instructions:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {order.special_instructions}
                      </p>
                    </div>
                  )}
                  
                  {/* Ready Time */}
                  {order.completed_at && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Clock className="h-4 w-4" />
                      <span>Ready at {new Date(order.completed_at).toLocaleTimeString()}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Action Button */}
                  <Button 
                    onClick={() => handleCompleteOrder(order.id)}
                    className="w-full flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark as Picked Up
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}