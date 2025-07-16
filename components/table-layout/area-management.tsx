'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  GripVertical,
  MapPin,
  Palette
} from 'lucide-react'
import type { TableArea, TableAreaInsert, TableAreaUpdate } from '@/types'

interface AreaManagementProps {
  areas: TableArea[]
  onClose: () => void
  onCreate: (area: Omit<TableAreaInsert, 'store_id'>) => Promise<TableArea | null>
  onUpdate: (areaId: string, updates: TableAreaUpdate) => Promise<boolean>
}

interface AreaFormData {
  name: string
  description: string
  color: string
  sort_order: number
}

const defaultColors = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
]

export function AreaManagement({
  areas,
  onClose,
  onCreate,
  onUpdate
}: AreaManagementProps) {
  const [editingArea, setEditingArea] = useState<TableArea | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState<AreaFormData>({
    name: '',
    description: '',
    color: defaultColors[0],
    sort_order: areas.length
  })

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: defaultColors[0],
      sort_order: areas.length
    })
    setEditingArea(null)
    setShowCreateForm(false)
  }

  // Handle create area
  const handleCreate = async () => {
    if (!formData.name.trim()) return

    setIsLoading(true)
    try {
      const newArea = await onCreate({
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        sort_order: formData.sort_order
      })

      if (newArea) {
        resetForm()
      }
    } catch (error) {
      console.error('Failed to create area:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle update area
  const handleUpdate = async () => {
    if (!editingArea || !formData.name.trim()) return

    setIsLoading(true)
    try {
      const success = await onUpdate(editingArea.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        sort_order: formData.sort_order
      })

      if (success) {
        resetForm()
      }
    } catch (error) {
      console.error('Failed to update area:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle edit area
  const handleEdit = (area: TableArea) => {
    setFormData({
      name: area.name,
      description: area.description || '',
      color: area.color || defaultColors[0],
      sort_order: area.sort_order || 0
    })
    setEditingArea(area)
    setShowCreateForm(true)
  }

  // Handle delete area
  const handleDelete = async (area: TableArea) => {
    if (!confirm(`Are you sure you want to delete "${area.name}"? This will affect all tables in this area.`)) {
      return
    }

    setIsLoading(true)
    try {
      await onUpdate(area.id, { is_active: false })
    } catch (error) {
      console.error('Failed to delete area:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Manage Dining Areas
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Create Area Button */}
          <div className="pb-4">
            <Button
              onClick={() => setShowCreateForm(true)}
              disabled={showCreateForm}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Area
            </Button>
          </div>

          {/* Create/Edit Form */}
          {showCreateForm && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  {editingArea ? `Edit "${editingArea.name}"` : 'Create New Area'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="area_name">Area Name</Label>
                  <Input
                    id="area_name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Main Dining Room, Patio, Private Room"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area_description">Description (optional)</Label>
                  <Textarea
                    id="area_description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this dining area"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {defaultColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded border-2 ${
                          formData.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_order">Display Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sort_order: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={editingArea ? handleUpdate : handleCreate}
                    disabled={!formData.name.trim() || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        {editingArea ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingArea ? 'Update Area' : 'Create Area'}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator className="my-4" />

          {/* Areas List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              Existing Areas ({areas.length})
            </h4>
            
            {areas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No dining areas created yet</p>
                <p className="text-sm">Create your first area to start designing your layout</p>
              </div>
            ) : (
              areas
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                .map(area => (
                  <Card key={area.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: area.color || '#3B82F6' }}
                            />
                            <h5 className="font-medium">{area.name}</h5>
                            <Badge variant="secondary" className="text-xs">
                              {area.description || 'No description'}
                            </Badge>
                          </div>
                          
                          {area.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {area.description}
                            </p>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            Order: {area.sort_order || 0}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(area)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(area)}
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            disabled={isLoading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}