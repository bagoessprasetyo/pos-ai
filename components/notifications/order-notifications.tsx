'use client'

import { useEffect, useState } from 'react'
import { useKitchenOrders } from '@/hooks/use-kitchen-orders'
import { useStoreSettings } from '@/hooks/use-store-settings'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCircle, X, Clock } from 'lucide-react'
import { KitchenOrderStatus, type KitchenOrderWithTransaction } from '@/types'

interface OrderNotificationsProps {
  className?: string
}

export function OrderNotifications({ className }: OrderNotificationsProps) {
  const { kitchen_dashboard_enabled } = useStoreSettings()
  const { hasPermission } = usePermissions()
  const { orders, completeOrder } = useKitchenOrders()
  const [notifications, setNotifications] = useState<KitchenOrderWithTransaction[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Only show notifications if kitchen dashboard is enabled and user has cashier permissions
  const shouldShowNotifications = kitchen_dashboard_enabled && hasPermission('kitchen', 'read')

  useEffect(() => {
    if (!shouldShowNotifications) return

    // Filter ready orders that haven't been dismissed
    const readyOrders = orders.filter(order => 
      order.status === KitchenOrderStatus.READY && !dismissed.has(order.id)
    )

    setNotifications(readyOrders)

    // Play notification sound for new ready orders
    if (readyOrders.length > 0) {
      playNotificationSound()
    }
  }, [orders, dismissed, shouldShowNotifications])

  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.1

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }

  const handleDismiss = (orderId: string) => {
    setDismissed(prev => new Set(prev).add(orderId))
  }

  const handleMarkComplete = async (orderId: string) => {
    await completeOrder(orderId)
    handleDismiss(orderId)
  }

  if (!shouldShowNotifications || notifications.length === 0) {
    return null
  }

  return (
    <div className={`fixed bottom-4 right-4 space-y-2 z-50 ${className}`}>
      {notifications.map((order) => (
        <Card key={order.id} className="w-80 border-green-200 bg-green-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg text-green-800">
                  Order Ready!
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(order.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Order #{order.order_number}</span>
                <Badge className="bg-green-100 text-green-800">
                  {order.status}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Items:</p>
                {order.transaction.transaction_items.slice(0, 2).map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.product.name}</span>
                  </div>
                ))}
                {order.transaction.transaction_items.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{order.transaction.transaction_items.length - 2} more items
                  </div>
                )}
              </div>

              {order.completed_at && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Clock className="h-4 w-4" />
                  <span>Ready at {new Date(order.completed_at).toLocaleTimeString()}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleMarkComplete(order.id)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDismiss(order.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}