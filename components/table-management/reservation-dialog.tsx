'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  Users, 
  TableProperties, 
  Save, 
  X,
  Phone,
  AlertCircle
} from 'lucide-react'
import { useTableReservations } from '@/hooks/use-table-reservations'
import { useTables } from '@/hooks/use-tables'
import type { Table } from '@/types'

interface ReservationDialogProps {
  table: Table | null
  onClose: () => void
  onSuccess: () => void
}

export function ReservationDialog({ table, onClose, onSuccess }: ReservationDialogProps) {
  const { createReservation } = useTableReservations()
  const { tables } = useTables()
  
  const [formData, setFormData] = useState({
    tableId: table?.id || '',
    partySize: table?.min_party_size || 2,
    customerName: '',
    customerPhone: '',
    reservationDate: new Date().toISOString().split('T')[0],
    reservationTime: '',
    notes: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get available tables for selection
  const availableTables = tables.filter(t => t.status === 'available')

  // Generate time slots (every 30 minutes from 9 AM to 10 PM)
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 22; hour++) {
      for (let minute of [0, 30]) {
        if (hour === 22 && minute === 30) break // Stop at 10 PM
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        slots.push({ value: time, label: displayTime })
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  const handleCreateReservation = async () => {
    if (!formData.tableId || !formData.customerName.trim() || !formData.reservationDate || !formData.reservationTime) {
      setError('Please fill in all required fields')
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

    // Validate reservation time is in the future
    const reservationDateTime = new Date(`${formData.reservationDate}T${formData.reservationTime}`)
    if (reservationDateTime <= new Date()) {
      setError('Reservation time must be in the future')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const success = await createReservation({
        table_id: formData.tableId,
        party_size: formData.partySize,
        customer_name: formData.customerName.trim(),
        customer_phone: formData.customerPhone.trim() || null,
        reservation_time: reservationDateTime.toISOString(),
        notes: formData.notes.trim() || null,
        status: 'confirmed',
        duration_minutes: 0
      })

      if (success) {
        onSuccess()
      } else {
        setError('Failed to create reservation. Please try again.')
      }
    } catch (error) {
      console.error('Failed to create reservation:', error)
      setError('Failed to create reservation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedTable = tables.find(t => t.id === formData.tableId)

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Make Reservation
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

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reservationDate">Date</Label>
              <Input
                id="reservationDate"
                type="date"
                min={minDate}
                value={formData.reservationDate}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  reservationDate: e.target.value 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservationTime">Time</Label>
              <select
                id="reservationTime"
                value={formData.reservationTime}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  reservationTime: e.target.value 
                }))}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="">Select time...</option>
                {timeSlots.map(slot => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

          {/* Customer Info */}
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                customerName: e.target.value 
              }))}
              placeholder="Enter customer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number</Label>
            <Input
              id="customerPhone"
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                customerPhone: e.target.value 
              }))}
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Special Requests</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                notes: e.target.value 
              }))}
              placeholder="Birthday, anniversary, allergies, etc."
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
              onClick={handleCreateReservation}
              disabled={!formData.tableId || !formData.customerName.trim() || !formData.reservationDate || !formData.reservationTime || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Reservation
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