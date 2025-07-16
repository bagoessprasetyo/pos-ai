'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  TableProperties, 
  Save, 
  X,
  UserPlus,
  AlertCircle
} from 'lucide-react'
import { useTableReservations } from '@/hooks/use-table-reservations'
import { useTables } from '@/hooks/use-tables'
import type { Table } from '@/types'

interface SeatGuestDialogProps {
  table: Table | null
  onClose: () => void
  onSuccess: () => void
}

export function SeatGuestDialog({ table, onClose, onSuccess }: SeatGuestDialogProps) {
  const { seatGuests } = useTableReservations()
  const { tables } = useTables()
  
  const [formData, setFormData] = useState({
    tableId: table?.id || '',
    partySize: table?.min_party_size || 2,
    customerName: '',
    notes: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get available tables for selection
  const availableTables = tables.filter(t => t.status === 'available')

  const handleSeatGuests = async () => {
    if (!formData.tableId || !formData.customerName.trim()) {
      setError('Please select a table and enter customer name')
      return
    }

    const selectedTable = tables.find(t => t.id === formData.tableId)
    if (!selectedTable) {
      setError('Selected table not found')
      return
    }

    // Validate party size
    if (formData.partySize < selectedTable.min_party_size) {
      setError(`Party size must be at least ${selectedTable.min_party_size} for this table`)
      return
    }

    if (selectedTable.max_party_size && formData.partySize > selectedTable.max_party_size) {
      setError(`Party size cannot exceed ${selectedTable.max_party_size} for this table`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const success = await seatGuests(formData.tableId, {
        party_size: formData.partySize,
        customer_name: formData.customerName.trim(),
        notes: formData.notes.trim() || undefined
      })

      if (success) {
        onSuccess()
      } else {
        setError('Failed to seat guests. Please try again.')
      }
    } catch (error) {
      console.error('Failed to seat guests:', error)
      setError('Failed to seat guests. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedTable = tables.find(t => t.id === formData.tableId)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Seat Guests
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Table Selection */}
          <div className="space-y-2">
            <Label htmlFor="table">Select Table</Label>
            <select
              id="table"
              value={formData.tableId}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                tableId: e.target.value,
                partySize: Math.max(
                  prev.partySize, 
                  tables.find(t => t.id === e.target.value)?.min_party_size || 1
                )
              }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
              disabled={!!table} // Disable if table is pre-selected
            >
              <option value="">Choose a table...</option>
              {availableTables.map(t => (
                <option key={t.id} value={t.id}>
                  Table {t.table_number} ({t.seats} seats)
                  {t.area && ` - ${t.area.name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Table Info */}
          {selectedTable && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TableProperties className="h-4 w-4" />
                <span className="font-medium">Table {selectedTable.table_number}</span>
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {selectedTable.seats} seats
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Min party: {selectedTable.min_party_size}</div>
                {selectedTable.max_party_size && (
                  <div>Max party: {selectedTable.max_party_size}</div>
                )}
                {selectedTable.area && (
                  <div>Area: {selectedTable.area.name}</div>
                )}
              </div>
            </div>
          )}

          {/* Party Size */}
          <div className="space-y-2">
            <Label htmlFor="partySize">Party Size</Label>
            <Input
              id="partySize"
              type="number"
              min={selectedTable?.min_party_size || 1}
              max={selectedTable?.max_party_size || undefined}
              value={formData.partySize}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                partySize: parseInt(e.target.value) || 1 
              }))}
            />
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                customerName: e.target.value 
              }))}
              placeholder="Enter customer or party name"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                notes: e.target.value 
              }))}
              placeholder="Special requests, allergies, etc."
              rows={2}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 p-2 bg-red-50 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSeatGuests}
              disabled={!formData.tableId || !formData.customerName.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Seating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Seat Guests
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}