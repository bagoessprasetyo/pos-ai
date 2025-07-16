'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Table, TablePosition, TableStatus, TableShape } from '@/types'

interface TableComponentProps {
  table: Table
  isSelected: boolean
  isDraggable: boolean
  gridSize: number
  onSelect: () => void
  onDrag: (table: Table, newPosition: TablePosition) => void
  onResize: (table: Table, newPosition: TablePosition) => void
}

export function TableComponent({
  table,
  isSelected,
  isDraggable,
  gridSize,
  onSelect,
  onDrag,
  onResize
}: TableComponentProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const tableRef = useRef<HTMLDivElement>(null)

  const position = table.position as TablePosition || { x: 0, y: 0, width: 80, height: 80, rotation: 0 }

  // Get table status color
  const getStatusColor = (status: any) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200'
      case 'occupied':
        return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200'
      case 'reserved':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200'
      case 'cleaning':
        return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200'
      case 'out_of_service':
        return 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  // Handle drag start
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isDraggable) return
    
    event.preventDefault()
    event.stopPropagation()
    
    onSelect()
    
    setIsDragging(true)
    setDragStart({
      x: event.clientX - position.x,
      y: event.clientY - position.y
    })
  }, [isDraggable, onSelect, position])

  // Handle resize start
  const handleResizeMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isDraggable) return
    
    event.preventDefault()
    event.stopPropagation()
    
    setIsResizing(true)
    setResizeStart({
      x: event.clientX,
      y: event.clientY,
      width: position.width,
      height: position.height
    })
  }, [isDraggable, position])

  // Handle mouse move
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      const newX = event.clientX - dragStart.x
      const newY = event.clientY - dragStart.y
      
      // Snap to grid
      const snappedX = Math.round(newX / gridSize) * gridSize
      const snappedY = Math.round(newY / gridSize) * gridSize
      
      const newPosition: TablePosition = {
        ...position,
        x: Math.max(0, snappedX),
        y: Math.max(0, snappedY)
      }
      
      onDrag(table, newPosition)
    } else if (isResizing) {
      const deltaX = event.clientX - resizeStart.x
      const deltaY = event.clientY - resizeStart.y
      
      const newWidth = Math.max(40, resizeStart.width + deltaX)
      const newHeight = Math.max(40, resizeStart.height + deltaY)
      
      // Snap to grid
      const snappedWidth = Math.round(newWidth / gridSize) * gridSize
      const snappedHeight = Math.round(newHeight / gridSize) * gridSize
      
      const newPosition: TablePosition = {
        ...position,
        width: snappedWidth,
        height: snappedHeight
      }
      
      onResize(table, newPosition)
    }
  }, [isDragging, isResizing, dragStart, resizeStart, gridSize, position, onDrag, onResize, table])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  // Attach global mouse events
  useState(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  })

  // Get table shape styles
  const getShapeStyles = (shape: TableShape) => {
    switch (shape) {
      case 'circle':
        return 'rounded-full'
      case 'square':
        return 'rounded-lg'
      case 'rectangle':
      default:
        return 'rounded-lg'
    }
  }

  // Table click handler
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onSelect()
  }

  return (
    <div
      ref={tableRef}
      className={cn(
        'absolute border-2 cursor-pointer transition-all duration-200 select-none',
        getStatusColor(table.status),
        getShapeStyles(table.shape as TableShape),
        isDragging && 'shadow-lg scale-105',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2',
        isDraggable && 'hover:shadow-md'
      )}
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        transform: `rotate(${position.rotation || 0}deg)`,
        zIndex: isSelected ? 10 : 1
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Table content */}
      <div className="w-full h-full flex flex-col items-center justify-center p-2">
        <div className="font-bold text-lg">{table.table_number}</div>
        <div className="text-xs opacity-75">{table.seats} seats</div>
        
        {table.status === 'occupied' && (
          <div className="text-xs mt-1 font-medium">
            Occupied
          </div>
        )}
        
        {table.status === 'reserved' && (
          <div className="text-xs mt-1 font-medium">
            Reserved
          </div>
        )}
      </div>

      {/* Resize handle */}
      {isSelected && isDraggable && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize rounded-tl-md"
          onMouseDown={handleResizeMouseDown}
        />
      )}

      {/* Status indicator */}
      <div
        className={cn(
          'absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white',
          table.status === 'available' && 'bg-green-500',
          table.status === 'occupied' && 'bg-red-500',
          table.status === 'reserved' && 'bg-yellow-500',
          table.status === 'cleaning' && 'bg-blue-500',
          table.status === 'out_of_service' && 'bg-gray-500'
        )}
      />
    </div>
  )
}