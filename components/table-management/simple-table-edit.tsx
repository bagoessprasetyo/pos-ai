'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Save, 
  X,
  TableProperties,
  Users,
  Hash
} from 'lucide-react'
import type { Table, TableUpdate } from '@/types'

interface SimpleTableEditProps {
  table: Table | null
  onClose: () => void
  onUpdate: (tableId: string, updates: TableUpdate) => Promise<boolean>
}

export function SimpleTableEdit({ table, onClose, onUpdate }: SimpleTableEditProps) {
  const [formData, setFormData] = useState({
    table_number: table?.table_number || '',
    seats: table?.seats || 4,
    min_party_size: table?.min_party_size || 1,
    max_party_size: table?.max_party_size || null,
    notes: table?.notes || '',
  })
  
  const [isSaving, setIsSaving] = useState(false)

  if (!table) return null

  const handleSave = async () => {
    if (!formData.table_number.trim()) {
      alert('Table number is required')
      return
    }

    if (formData.seats < 1) {
      alert('Seats must be at least 1')
      return
    }

    if (formData.min_party_size < 1) {
      alert('Minimum party size must be at least 1')
      return
    }

    if (formData.max_party_size && formData.max_party_size < formData.min_party_size) {
      alert('Maximum party size cannot be less than minimum party size')
      return
    }

    setIsSaving(true)
    
    try {
      const updates: TableUpdate = {
        table_number: formData.table_number.trim(),
        seats: formData.seats,
        min_party_size: formData.min_party_size,
        max_party_size: formData.max_party_size || null,
        notes: formData.notes.trim() || null,
      }
      
      const success = await onUpdate(table.id, updates)
      if (success) {
        onClose()
      } else {
        alert('Failed to update table. Please try again.')
      }
    } catch (error) {
      console.error('Failed to update table:', error)
      alert('Error updating table: ' + error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TableProperties className="h-5 w-5" />
            Edit Table {table.table_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Table Number */}
          <div className="space-y-2">
            <Label htmlFor="table_number">Table Number</Label>
            <Input
              id="table_number"
              value={formData.table_number}
              onChange={(e) => setFormData(prev => ({ ...prev, table_number: e.target.value }))}
              placeholder="Table number (e.g., T1, 5, A-12)"
            />
          </div>

          {/* Seats */}
          <div className="space-y-2">
            <Label htmlFor="seats">Number of Seats</Label>
            <Input
              id="seats"
              type="number"
              min="1"
              max="20"
              value={formData.seats}
              onChange={(e) => setFormData(prev => ({ ...prev, seats: parseInt(e.target.value) || 1 }))}
            />
          </div>

          {/* Party Size Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_party_size">Min Party Size</Label>
              <Input
                id="min_party_size"
                type="number"
                min="1"
                value={formData.min_party_size}
                onChange={(e) => setFormData(prev => ({ ...prev, min_party_size: parseInt(e.target.value) || 1 }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_party_size">Max Party Size</Label>
              <Input
                id="max_party_size"
                type="number"
                min="1"
                value={formData.max_party_size || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_party_size: e.target.value ? parseInt(e.target.value) : null 
                }))}
                placeholder="Leave empty for no limit"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Special notes about this table (e.g., window seat, high top, booth)"
              rows={3}
            />
          </div>

          {/* Current Status Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Current Status</div>
            <Badge className={
              table.status === 'available' ? 'bg-green-100 text-green-800' :
              table.status === 'occupied' ? 'bg-red-100 text-red-800' :
              table.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
              table.status === 'cleaning' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }>
              {table.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Status can be changed from the table list
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.table_number.trim()}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
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