'use client'

import { useState } from 'react'
import { useInventory } from '@/hooks/use-inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InventoryDialog } from '@/components/forms/inventory-dialog'
import { InventoryAdjustmentDialog } from '@/components/forms/inventory-adjustment-dialog'
import { 
  Loader2, 
  Search, 
  AlertTriangle, 
  Package, 
  TrendingDown, 
  DollarSign,
  Edit,
  Plus,
  Minus
} from 'lucide-react'
import { formatPrice } from '@/utils/currency'
import type { InventoryWithProduct } from '@/hooks/use-inventory'

export default function InventoryPage() {
  const { 
    inventory, 
    loading, 
    error, 
    getLowStockItems, 
    getOutOfStockItems, 
    getTotalInventoryValue 
  } = useInventory()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInventory, setSelectedInventory] = useState<InventoryWithProduct | null>(null)
  const [showInventoryDialog, setShowInventoryDialog] = useState(false)
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase')

  const filteredInventory = inventory.filter(inv =>
    inv.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const lowStockItems = getLowStockItems()
  const outOfStockItems = getOutOfStockItems()
  const totalValue = getTotalInventoryValue()

  const handleEditInventory = (inventory: InventoryWithProduct) => {
    setSelectedInventory(inventory)
    setShowInventoryDialog(true)
  }

  const handleAdjustInventory = (inventory: InventoryWithProduct, type: 'increase' | 'decrease') => {
    setSelectedInventory(inventory)
    setAdjustmentType(type)
    setShowAdjustmentDialog(true)
  }

  const getStockStatus = (inv: InventoryWithProduct) => {
    if (inv.quantity <= 0) return { label: 'Out of Stock', variant: 'destructive' as const }
    if (inv.reorder_point > 0 && inv.quantity <= inv.reorder_point) {
      return { label: 'Low Stock', variant: 'secondary' as const }
    }
    return { label: 'In Stock', variant: 'default' as const }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading inventory: {error}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track stock levels and manage inventory adjustments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Items
            </CardDescription>
            <CardTitle className="text-2xl">{inventory.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Out of Stock
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">{outOfStockItems.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Low Stock
            </CardDescription>
            <CardTitle className="text-2xl text-orange-600">{lowStockItems.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardDescription>
            <CardTitle className="text-2xl">{formatPrice(totalValue)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Alerts */}
      {(outOfStockItems.length > 0 || lowStockItems.length > 0) && (
        <div className="space-y-4 mb-6">
          {outOfStockItems.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="pb-3">
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Out of Stock Items ({outOfStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {outOfStockItems.slice(0, 5).map((item) => (
                    <Badge key={item.id} variant="destructive">
                      {item.product.name}
                    </Badge>
                  ))}
                  {outOfStockItems.length > 5 && (
                    <Badge variant="outline">+{outOfStockItems.length - 5} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {lowStockItems.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-orange-600 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Low Stock Items ({lowStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lowStockItems.slice(0, 5).map((item) => (
                    <Badge key={item.id} variant="secondary">
                      {item.product.name} ({item.quantity} left)
                    </Badge>
                  ))}
                  {lowStockItems.length > 5 && (
                    <Badge variant="outline">+{lowStockItems.length - 5} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products by name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Inventory Table */}
      {inventory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No inventory found</h3>
            <p className="text-muted-foreground mb-4">
              Products with inventory tracking will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((inv) => {
                    const status = getStockStatus(inv)
                    const itemValue = inv.quantity * inv.product.price
                    
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{inv.product.name}</div>
                            {inv.product.barcode && (
                              <div className="text-sm text-muted-foreground">
                                {inv.product.barcode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {inv.product.sku || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {inv.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.reserved_quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.reorder_point || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(itemValue)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditInventory(inv)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAdjustInventory(inv, 'increase')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAdjustInventory(inv, 'decrease')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <InventoryDialog
        inventory={selectedInventory}
        open={showInventoryDialog}
        onClose={() => {
          setShowInventoryDialog(false)
          setSelectedInventory(null)
        }}
      />

      <InventoryAdjustmentDialog
        inventory={selectedInventory}
        adjustmentType={adjustmentType}
        open={showAdjustmentDialog}
        onClose={() => {
          setShowAdjustmentDialog(false)
          setSelectedInventory(null)
        }}
      />
    </div>
  )
}