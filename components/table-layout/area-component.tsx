'use client'

import { cn } from '@/lib/utils'
import type { TableArea, TableAreaUpdate } from '@/types'

interface AreaComponentProps {
  area: TableArea
  isSelected: boolean
  onSelect: () => void
  onUpdate: (areaId: string, updates: TableAreaUpdate) => Promise<boolean>
}

export function AreaComponent({
  area,
  isSelected,
  onSelect,
  onUpdate
}: AreaComponentProps) {
  
  const handleClick = (event: React.MouseEvent) => {
    console.log('🏢 Area clicked:', area.name)
    event.stopPropagation()
    onSelect()
  }

  return (
    <div
      className={cn(
        'absolute border-2 border-dashed cursor-pointer transition-all duration-200',
        'bg-opacity-10 hover:bg-opacity-20',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2 border-solid'
      )}
      style={{
        backgroundColor: area.color || '#3B82F6',
        borderColor: area.color || '#3B82F6',
        left: 20,
        top: 20,
        width: 200,
        height: 150,
        zIndex: isSelected ? 5 : 0
      }}
      onClick={handleClick}
    >
      {/* Area label */}
      <div 
        className="absolute -top-6 left-0 px-2 py-1 rounded text-sm font-medium text-white"
        style={{ backgroundColor: area.color || '#3B82F6' }}
      >
        {area.name}
      </div>

      {/* Area description */}
      {area.description && (
        <div className="absolute bottom-2 left-2 text-xs opacity-75 max-w-full truncate">
          {area.description}
        </div>
      )}
    </div>
  )
}