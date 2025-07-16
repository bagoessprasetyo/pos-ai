'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Save, RotateCw, Users, Hash, StickyNote, Shapes } from 'lucide-react'
import type { Table, TableUpdate, TableShape, TableStatus } from '@/types'

interface TablePropertiesPanelProps {
  table: Table
  onClose: () => void
  onUpdate: (tableId: string, updates: TableUpdate) => Promise<boolean>
}

export function TablePropertiesPanel({
  table,
  onClose,
  onUpdate
}: TablePropertiesPanelProps) {
  const [formData, setFormData] = useState({
    table_number: table.table_number,
    seats: table.seats,
    min_party_size: table.min_party_size,
    max_party_size: table.max_party_size || undefined,
    shape: table.shape,
    status: table.status,
    notes: table.notes || '',
  })
  
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const updates: TableUpdate = {
        table_number: formData.table_number,
        seats: formData.seats,
        min_party_size: formData.min_party_size,
        max_party_size: formData.max_party_size || null,
        shape: formData.shape,
        status: formData.status,
        notes: formData.notes || null,
      }
      
      const success = await onUpdate(table.id, updates)
      if (success) {
        onClose()
      }
    } catch (error) {
      console.error('Failed to update table:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRotate = () => {
    const currentPosition = table.position as any || { rotation: 0 }
    const newRotation = (currentPosition.rotation + 45) % 360
    
    onUpdate(table.id, {
      position: {
        ...currentPosition,
        rotation: newRotation
      }
    })
  }

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'occupied': return 'bg-red-100 text-red-800'
      case 'reserved': return 'bg-yellow-100 text-yellow-800'
      case 'cleaning': return 'bg-blue-100 text-blue-800'
      case 'out_of_service': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg">Table Properties</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="table_number">Table Number</Label>
              <Input
                id="table_number"
                value={formData.table_number}
                onChange={(e) => setFormData(prev => ({ ...prev, table_number: e.target.value }))}
                placeholder="Table number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="seats">Seats</Label>
                <Input
                  id="seats"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.seats}
                  onChange={(e) => setFormData(prev => ({ ...prev, seats: parseInt(e.target.value) || 1 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="min_party_size">Min Party</Label>
                <Input
                  id="min_party_size"
                  type="number"
                  min="1"
                  value={formData.min_party_size}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_party_size: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_party_size">Max Party Size (optional)</Label>
              <Input
                id="max_party_size"
                type="number"
                min="1"
                value={formData.max_party_size || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_party_size: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                placeholder="Leave empty for no limit"
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shapes className="h-4 w-4" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Shape</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['rectangle', 'square', 'circle'] as TableShape[]).map(shape => (
                  <Button
                    key={shape}
                    variant={formData.shape === shape ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, shape }))}
                    className="capitalize"
                  >
                    {shape}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rotation</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="w-full"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Rotate 45°
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div className="grid grid-cols-1 gap-2">
                {(['available', 'occupied', 'reserved', 'cleaning', 'out_of_service'] as TableStatus[]).map(status => (
                  <Button
                    key={status}
                    variant={formData.status === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, status }))}
                    className="justify-start capitalize"
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status).replace('text-', 'bg-').split(' ')[0]}`} />
                    {status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Table Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this table (e.g., window seat, high top, booth)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Position Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">X:</span> {(table.position as any)?.x || 0}px
              </div>
              <div>
                <span className="text-muted-foreground">Y:</span> {(table.position as any)?.y || 0}px
              </div>
              <div>
                <span className="text-muted-foreground">Width:</span> {(table.position as any)?.width || 80}px
              </div>
              <div>
                <span className="text-muted-foreground">Height:</span> {(table.position as any)?.height || 80}px
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
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
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}