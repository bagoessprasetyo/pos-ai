'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  TableProperties, 
  Plus, 
  Save, 
  AlertCircle,
  Users,
  Hash,
  Zap
} from 'lucide-react'
import type { TableInsert } from '@/types'

interface SimpleTableSetupProps {
  onCreateTables: (tables: Omit<TableInsert, 'store_id'>[]) => Promise<boolean>
  existingTableCount: number
}

export function SimpleTableSetup({ onCreateTables, existingTableCount }: SimpleTableSetupProps) {
  const [setupData, setSetupData] = useState({
    prefix: '', // e.g., "T" for T1, T2, T3... or empty for 1, 2, 3...
    startNumber: existingTableCount + 1,
    totalTables: 10,
    defaultSeats: 4,
    separator: '' // e.g., "-" for T-1, T-2... or empty for T1, T2...
  })
  
  const [isCreating, setIsCreating] = useState(false)
  const [previewTables, setPreviewTables] = useState<string[]>([])

  // Generate preview of table numbers
  const generatePreview = () => {
    const tables: string[] = []
    for (let i = 0; i < Math.min(setupData.totalTables, 20); i++) {
      const number = setupData.startNumber + i
      const tableNumber = `${setupData.prefix}${setupData.separator}${number}`
      tables.push(tableNumber)
    }
    
    // Add "..." if more than 20 tables
    if (setupData.totalTables > 20) {
      tables.push('...')
    }
    
    setPreviewTables(tables)
  }

  // Update preview when data changes
  useEffect(() => {
    generatePreview()
  }, [setupData])

  const handleSetupChange = (field: string, value: string | number) => {
    setSetupData(prev => ({ ...prev, [field]: value }))
    setTimeout(generatePreview, 0) // Generate preview after state update
  }

  const handleCreateTables = async () => {
    if (setupData.totalTables <= 0 || setupData.defaultSeats <= 0) {
      alert('Please enter valid numbers for tables and seats')
      return
    }

    setIsCreating(true)
    
    try {
      const tables: Omit<TableInsert, 'store_id'>[] = []
      
      for (let i = 0; i < setupData.totalTables; i++) {
        const number = setupData.startNumber + i
        const tableNumber = `${setupData.prefix}${setupData.separator}${number}`
        
        tables.push({
          table_number: tableNumber,
          seats: setupData.defaultSeats,
          min_party_size: 1,
          max_party_size: null,
          shape: 'rectangle',
          status: 'available',
          area_id: null,
          notes: null,
          position: null // No visual positioning in simple mode
        })
      }
      
      const success = await onCreateTables(tables)
      
      if (success) {
        alert(`Successfully created ${setupData.totalTables} tables!`)
        // Reset form
        setSetupData({
          prefix: '',
          startNumber: existingTableCount + setupData.totalTables + 1,
          totalTables: 10,
          defaultSeats: 4,
          separator: ''
        })
      } else {
        alert('Failed to create tables. Please try again.')
      }
    } catch (error) {
      console.error('Error creating tables:', error)
      alert('Error creating tables: ' + error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Table Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table Numbering Format */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefix (optional)</Label>
              <Input
                id="prefix"
                value={setupData.prefix}
                onChange={(e) => handleSetupChange('prefix', e.target.value)}
                placeholder="T, A, Table..."
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Add before number (e.g., "T" → T1, T2...)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="separator">Separator (optional)</Label>
              <Input
                id="separator"
                value={setupData.separator}
                onChange={(e) => handleSetupChange('separator', e.target.value)}
                placeholder="-, _, space..."
                maxLength={3}
              />
              <p className="text-xs text-muted-foreground">
                Between prefix and number
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="startNumber">Start Number</Label>
              <Input
                id="startNumber"
                type="number"
                min="1"
                value={setupData.startNumber}
                onChange={(e) => handleSetupChange('startNumber', parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                First table number
              </p>
            </div>
          </div>

          <Separator />

          {/* Table Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalTables">Number of Tables</Label>
              <Input
                id="totalTables"
                type="number"
                min="1"
                max="200"
                value={setupData.totalTables}
                onChange={(e) => handleSetupChange('totalTables', parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="defaultSeats">Seats per Table</Label>
              <Input
                id="defaultSeats"
                type="number"
                min="1"
                max="20"
                value={setupData.defaultSeats}
                onChange={(e) => handleSetupChange('defaultSeats', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview Table Numbers</Label>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex flex-wrap gap-2">
                {previewTables.map((tableNumber, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tableNumber}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Will create {setupData.totalTables} tables with {setupData.defaultSeats} seats each
              </p>
            </div>
          </div>

          {/* Warning for existing tables */}
          {existingTableCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You already have {existingTableCount} tables. New tables will be added to existing ones.
              </p>
            </div>
          )}

          {/* Create Button */}
          <Button 
            onClick={handleCreateTables}
            disabled={isCreating || setupData.totalTables <= 0}
            className="w-full"
            size="lg"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating {setupData.totalTables} tables...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create {setupData.totalTables} Tables
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}