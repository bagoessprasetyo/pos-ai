'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Filter,
  X,
  Search,
  SortAsc,
  SortDesc,
  Download,
  RefreshCw,
  Bookmark,
  BookmarkPlus
} from 'lucide-react'
import type { 
  FilterConfig, 
  FilterState, 
  SearchAndFilterState, 
  SortConfig, 
  FilterPreset 
} from '@/lib/filters'

interface FiltersProps {
  configs: FilterConfig[]
  state: SearchAndFilterState
  onChange: (state: SearchAndFilterState) => void
  presets?: FilterPreset[]
  onExport?: (format: 'csv' | 'xlsx' | 'json' | 'pdf') => void
  onSavePreset?: (name: string, filters: FilterState) => void
  searchPlaceholder?: string
  className?: string
}

export function Filters({
  configs,
  state,
  onChange,
  presets = [],
  onExport,
  onSavePreset,
  searchPlaceholder = 'Search...',
  className = ''
}: FiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [showPresetSave, setShowPresetSave] = useState(false)

  const activeFilterCount = Object.keys(state.filters).filter(
    key => state.filters[key] !== null && 
           state.filters[key] !== undefined && 
           state.filters[key] !== ''
  ).length

  const handleSearchChange = useCallback((query: string) => {
    onChange({ ...state, query, page: 1 })
  }, [state, onChange])

  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...state.filters }
    
    if (value === null || value === undefined || value === '') {
      delete newFilters[key]
    } else {
      newFilters[key] = value
    }

    onChange({ ...state, filters: newFilters, page: 1 })
  }, [state, onChange])

  const handleSortChange = useCallback((field: string) => {
    const newDirection = state.sort.field === field && state.sort.direction === 'asc' 
      ? 'desc' 
      : 'asc'
    
    onChange({ 
      ...state, 
      sort: { field, direction: newDirection },
      page: 1 
    })
  }, [state, onChange])

  const handlePresetApply = useCallback((preset: FilterPreset) => {
    onChange({ 
      ...state, 
      filters: preset.filters,
      page: 1 
    })
  }, [state, onChange])

  const handleClearFilters = useCallback(() => {
    onChange({ 
      ...state, 
      query: '',
      filters: {},
      page: 1 
    })
  }, [state, onChange])

  const handleSavePreset = useCallback(() => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), state.filters)
      setPresetName('')
      setShowPresetSave(false)
    }
  }, [presetName, state.filters, onSavePreset])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and main controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={state.query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* Filters toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Sort dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                {state.sort.direction === 'asc' ? (
                  <SortAsc className="mr-2 h-4 w-4" />
                ) : (
                  <SortDesc className="mr-2 h-4 w-4" />
                )}
                Sort
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sort by:</Label>
                {configs.map(config => (
                  <Button
                    key={config.key as string}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleSortChange(config.key as string)}
                  >
                    {config.label}
                    {state.sort.field === config.key && (
                      state.sort.direction === 'asc' ? 
                        <SortAsc className="ml-auto h-4 w-4" /> : 
                        <SortDesc className="ml-auto h-4 w-4" />
                    )}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Export dropdown */}
          {onExport && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => onExport('csv')}
                  >
                    CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => onExport('xlsx')}
                  >
                    Excel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => onExport('json')}
                  >
                    JSON
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => onExport('pdf')}
                  >
                    PDF
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Clear filters */}
          {(activeFilterCount > 0 || state.query) && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter presets */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map(preset => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={() => handlePresetApply(preset)}
              className="h-8"
            >
              <Bookmark className="mr-1 h-3 w-3" />
              {preset.name}
            </Button>
          ))}
          
          {onSavePreset && (
            <Popover open={showPresetSave} onOpenChange={setShowPresetSave}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <BookmarkPlus className="mr-1 h-3 w-3" />
                  Save
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60">
                <div className="space-y-3">
                  <Label>Preset Name</Label>
                  <Input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Enter preset name"
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSavePreset}>
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowPresetSave(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(state.filters).map(([key, value]) => {
            if (value === null || value === undefined || value === '') return null
            
            const config = configs.find(c => c.key === key)
            const label = config?.label || key
            
            return (
              <Badge key={key} variant="secondary" className="gap-1">
                {label}: {formatFilterValue(value, config)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => handleFilterChange(key, null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {configs.map(config => (
                <FilterField
                  key={config.key as string}
                  config={config}
                  value={state.filters[config.key as string]}
                  onChange={(value) => handleFilterChange(config.key as string, value)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface FilterFieldProps {
  config: FilterConfig
  value: any
  onChange: (value: any) => void
}

function FilterField({ config, value, onChange }: FilterFieldProps) {
  switch (config.type) {
    case 'text':
      return (
        <div className="space-y-2">
          <Label>{config.label}</Label>
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={config.placeholder}
          />
        </div>
      )

    case 'select':
      return (
        <div className="space-y-2">
          <Label>{config.label}</Label>
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={config.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map(option => (
                <SelectItem key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )

    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={config.key as string}
            checked={value || false}
            onCheckedChange={onChange}
          />
          <Label htmlFor={config.key as string}>{config.label}</Label>
        </div>
      )

    case 'date':
      return (
        <div className="space-y-2">
          <Label>{config.label}</Label>
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )

    case 'dateRange':
      return (
        <div className="space-y-2">
          <Label>{config.label}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={value?.start || ''}
              onChange={(e) => onChange({ ...value, start: e.target.value })}
              placeholder="Start date"
            />
            <Input
              type="date"
              value={value?.end || ''}
              onChange={(e) => onChange({ ...value, end: e.target.value })}
              placeholder="End date"
            />
          </div>
        </div>
      )

    case 'number':
      return (
        <div className="space-y-2">
          <Label>{config.label}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={value?.min || ''}
              onChange={(e) => onChange({ ...value, min: Number(e.target.value) || undefined })}
              placeholder="Min"
            />
            <Input
              type="number"
              value={value?.max || ''}
              onChange={(e) => onChange({ ...value, max: Number(e.target.value) || undefined })}
              placeholder="Max"
            />
          </div>
        </div>
      )

    case 'multiSelect':
      return (
        <div className="space-y-2">
          <Label>{config.label}</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {config.options?.map(option => (
              <div key={String(option.value)} className="flex items-center space-x-2">
                <Checkbox
                  id={`${String(config.key)}-${String(option.value)}`}
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(value) ? value : []
                    if (checked) {
                      onChange([...currentValues, option.value])
                    } else {
                      onChange(currentValues.filter(v => v !== option.value))
                    }
                  }}
                />
                <Label 
                  htmlFor={`${String(config.key)}-${String(option.value)}`}
                  className="text-sm"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return null
  }
}

function formatFilterValue(value: any, config?: FilterConfig): string {
  if (value === null || value === undefined) return ''
  
  if (config?.type === 'dateRange' && typeof value === 'object') {
    const start = value.start ? new Date(value.start).toLocaleDateString() : ''
    const end = value.end ? new Date(value.end).toLocaleDateString() : ''
    return `${start} - ${end}`
  }
  
  if (config?.type === 'number' && typeof value === 'object') {
    const min = value.min !== undefined ? value.min : ''
    const max = value.max !== undefined ? value.max : ''
    return `${min} - ${max}`
  }
  
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  
  return String(value)
}