'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/utils/currency'
import { Receipt, Clock, Package } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface RecentTransactionsProps {
  recentTransactions: Array<{
    id: string
    transaction_number: string
    total: number
    items_count: number
    created_at: string
  }>
}

export function RecentTransactions({ recentTransactions }: RecentTransactionsProps) {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recent transactions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 text-primary rounded-full">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">
                      #{transaction.transaction_number}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {formatPrice(transaction.total)}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Package className="h-3 w-3" />
                    {transaction.items_count} {transaction.items_count === 1 ? 'item' : 'items'}
                  </div>
                </div>
              </div>
            ))}
            
            {recentTransactions.length === 5 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  View All Transactions
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}