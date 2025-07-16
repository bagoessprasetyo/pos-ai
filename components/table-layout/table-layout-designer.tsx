'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { TableComponent } from './table-component'
import { AreaComponent } from './area-component'
import { GridBackground } from './grid-background'
import type { 
  Table, 
  TableArea, 
  TableLayoutDesigner as LayoutState,
  TableInsert,
  TableAreaInsert,
  TablePosition,
  TableShape
} from '@/types'

interface TableLayoutDesignerProps {
  state: LayoutState
  onStateChange: (state: LayoutState) => void
  onTableSelect: (table: Table | null) => void
  onAreaSelect: (area: TableArea | null) => void
  onTableCreate: (table: Omit<TableInsert, 'store_id'>) => Promise<Table | null>
  onTableUpdate: (tableId: string, updates: Partial<Table>) => Promise<boolean>
  onAreaCreate: (area: Omit<TableAreaInsert, 'store_id'>) => Promise<TableArea | null>
  onAreaUpdate: (areaId: string, updates: Partial<TableArea>) => Promise<boolean>
}

export function TableLayoutDesigner({
  state,
  onStateChange,
  onTableSelect,
  onAreaSelect,
  onTableCreate,
  onTableUpdate,
  onAreaCreate,
  onAreaUpdate
}: TableLayoutDesignerProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isCreatingTable, setIsCreatingTable] = useState(false)
  const [isCreatingArea, setIsCreatingArea] = useState(false)

  // Add debug log on component mount
  useEffect(() => {
    console.log('TableLayoutDesigner mounted with state:', state)
  }, [])

  // Handle canvas click for adding tables/areas
  const handleCanvasClick = useCallback(async (event: React.MouseEvent) => {
    console.log('🖱️ CANVAS CLICKED! Event received:', event.type)
    console.log('🎯 Current mode:', state.mode)
    console.log('📊 Canvas ref exists:', !!canvasRef.current)
    
    try {
      if (!canvasRef.current) {
        console.error('❌ Canvas ref is null')
        return
      }

      const rect = canvasRef.current.getBoundingClientRect()
      console.log('📐 Canvas rect:', rect)
      
      const x = (event.clientX - rect.left) / state.zoom
      const y = (event.clientY - rect.top) / state.zoom

      // Snap to grid
      const snappedX = Math.round(x / state.grid_size) * state.grid_size
      const snappedY = Math.round(y / state.grid_size) * state.grid_size

      console.log('📍 Click coordinates:', { 
        raw: { x: event.clientX - rect.left, y: event.clientY - rect.top },
        adjusted: { x, y }, 
        snapped: { snappedX, snappedY },
        zoom: state.zoom,
        gridSize: state.grid_size
      })

      if (state.mode === 'add_table' && !isCreatingTable) {
        console.log('🟢 Creating table...')
        setIsCreatingTable(true)
        
        // Create new table
        const position = {
          x: snappedX,
          y: snappedY,
          width: 80,
          height: 80,
          rotation: 0
        }
        
        const newTable: Omit<TableInsert, 'store_id'> = {
          table_number: generateTableNumber(),
          seats: 4,
          min_party_size: 1,
          max_party_size: null,
          shape: 'rectangle' as TableShape,
          position: position as any, // Cast to any to handle JSONB
          status: 'available' as const,
          area_id: null,
          notes: null
        }

        console.log('📝 New table data:', newTable)
        const createdTable = await onTableCreate(newTable)
        console.log('✅ Created table result:', createdTable)
        if (createdTable) {
          onTableSelect(createdTable)
        }
        
        setIsCreatingTable(false)
      } else if (state.mode === 'add_area' && !isCreatingArea) {
        console.log('🟢 Creating area...')
        setIsCreatingArea(true)
        
        // Create new area
        const newArea: Omit<TableAreaInsert, 'store_id'> = {
          name: `Area ${state.areas.length + 1}`,
          description: '',
          color: '#3B82F6',
          sort_order: state.areas.length
        }

        console.log('📝 New area data:', newArea)
        const createdArea = await onAreaCreate(newArea)
        console.log('✅ Created area result:', createdArea)
        if (createdArea) {
          onAreaSelect(createdArea)
        }
        
        setIsCreatingArea(false)
      } else if (state.mode === 'select') {
        console.log('🔍 Select mode - deselecting items')
        // Deselect if clicking on empty space
        onTableSelect(null)
        onAreaSelect(null)
      } else {
        console.log('❓ Unknown mode or already creating:', { 
          mode: state.mode, 
          isCreatingTable, 
          isCreatingArea 
        })
      }
    } catch (error) {
      console.error('❌ Error in canvas click handler:', error)
    }
  }, [state, onTableCreate, onAreaCreate, onTableSelect, onAreaSelect, isCreatingTable, isCreatingArea])

  // Generate unique table number
  const generateTableNumber = () => {
    console.log('🔢 Generating table number, areas:', state.areas)
    
    try {
      if (!state.areas || state.areas.length === 0) {
        console.log('🆕 No areas found, starting with table 1')
        return '1'
      }

      const existingNumbers = state.areas
        .flatMap(area => area.tables || [])
        .map(table => {
          const match = table.table_number?.match(/\d+/)
          return match ? parseInt(match[0]) : 0
        })
        .filter(n => n > 0)

      console.log('📊 Existing table numbers:', existingNumbers)
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
      console.log('🎯 Next table number will be:', nextNumber)
      return nextNumber.toString()
    } catch (error) {
      console.error('❌ Error generating table number:', error)
      return '1' // Fallback
    }
  }

  // Handle table drag
  const handleTableDrag = useCallback(async (table: Table, newPosition: TablePosition) => {
    await onTableUpdate(table.id, { 
      position: newPosition 
    })
  }, [onTableUpdate])

  // Handle table resize
  const handleTableResize = useCallback(async (table: Table, newPosition: TablePosition) => {
    await onTableUpdate(table.id, { 
      position: newPosition 
    })
  }, [onTableUpdate])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onTableSelect(null)
        onAreaSelect(null)
        onStateChange({ ...state, mode: 'select' })
      }
      
      if (event.key === 'Delete' && state.selectedTable) {
        // Handle table deletion
        if (confirm('Are you sure you want to delete this table?')) {
          onTableUpdate(state.selectedTable.id, { is_active: false })
          onTableSelect(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, onTableSelect, onAreaSelect, onStateChange, onTableUpdate])

  // Debug canvas size
  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      console.log('📐 Canvas size:', { 
        width: rect.width, 
        height: rect.height, 
        top: rect.top, 
        left: rect.left 
      })
    }
  }, [state.zoom])

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Debug info */}
      <div className="absolute top-2 right-2 z-50 bg-black/75 text-white p-2 rounded text-xs">
        Mode: {state.mode} | Zoom: {state.zoom} | Areas: {state.areas?.length || 0}
      </div>
      
      {/* Canvas container */}
      <div
        ref={canvasRef}
        className="relative w-full h-full cursor-crosshair"
        style={{
          transform: `scale(${state.zoom})`,
          transformOrigin: 'top left',
          minHeight: '400px', // Ensure canvas has minimum size
          backgroundColor: state.mode === 'add_table' ? 'rgba(0,255,0,0.05)' : 
                           state.mode === 'add_area' ? 'rgba(0,0,255,0.05)' : 'transparent'
        }}
        onClick={handleCanvasClick}
        onMouseDown={(e) => console.log('🖱️ Mouse down on canvas')}
        onMouseUp={(e) => console.log('🖱️ Mouse up on canvas')}
      >
        {/* Grid background */}
        <GridBackground 
          gridSize={state.grid_size} 
          zoom={state.zoom}
        />

        {/* Render areas */}
        {state.areas.map(area => (
          <AreaComponent
            key={area.id}
            area={area}
            isSelected={state.selectedArea?.id === area.id}
            onSelect={() => onAreaSelect(area)}
            onUpdate={onAreaUpdate}
          />
        ))}

        {/* Render all tables */}
        {state.areas.flatMap(area => area.tables).map(table => (
          <TableComponent
            key={table.id}
            table={table}
            isSelected={state.selectedTable?.id === table.id}
            isDraggable={state.mode === 'select' || state.mode === 'edit'}
            gridSize={state.grid_size}
            onSelect={() => onTableSelect(table)}
            onDrag={handleTableDrag}
            onResize={handleTableResize}
          />
        ))}

        {/* Mode indicators */}
        {state.mode === 'add_table' && (
          <div className="absolute top-4 left-4 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg text-sm font-medium">
            Click to add a table
          </div>
        )}

        {state.mode === 'add_area' && (
          <div className="absolute top-4 left-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-2 rounded-lg text-sm font-medium">
            Click to add an area
          </div>
        )}
      </div>

      {/* Canvas overlay for interactions */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Selection indicator */}
        {state.selectedTable && (
          <div
            className="absolute border-2 border-blue-500 rounded pointer-events-none"
            style={{
              left: (state.selectedTable.position?.x || 0) * state.zoom - 2,
              top: (state.selectedTable.position?.y || 0) * state.zoom - 2,
              width: ((state.selectedTable.position?.width || 80) + 4) * state.zoom,
              height: ((state.selectedTable.position?.height || 80) + 4) * state.zoom,
            }}
          />
        )}
      </div>

      {/* Loading overlay */}
      {(isCreatingTable || isCreatingArea) && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="bg-background rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">
                {isCreatingTable ? 'Creating table...' : 'Creating area...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}