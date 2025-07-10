'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown, 
  ChevronRight, 
  FolderOpen, 
  Folder, 
  MoreVertical,
  Edit,
  Trash2,
  Plus
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Category } from '@/types'

interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[]
}

interface CategoryTreeProps {
  categories: CategoryWithChildren[] | Category[]
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
  isFiltered?: boolean
}

interface CategoryNodeProps {
  category: CategoryWithChildren
  level: number
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
  onAddChild: (parentId: string) => void
}

function CategoryNode({ category, level, onEdit, onDelete, onAddChild }: CategoryNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0) // Expand root categories by default
  const hasChildren = category.children && category.children.length > 0
  
  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleEdit = () => {
    onEdit(category)
  }

  const handleDelete = () => {
    onDelete(category.id)
  }

  const handleAddChild = () => {
    onAddChild(category.id)
  }

  return (
    <div className="select-none">
      <Card className={`mb-2 hover:shadow-md transition-shadow ${level > 0 ? 'ml-6' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Expand/Collapse Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={handleToggle}
                disabled={!hasChildren}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )
                ) : (
                  <div className="h-4 w-4" />
                )}
              </Button>

              {/* Folder Icon */}
              <div className="shrink-0">
                {hasChildren ? (
                  isExpanded ? (
                    <FolderOpen className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Folder className="h-5 w-5 text-blue-500" />
                  )
                ) : (
                  <Folder className="h-5 w-5 text-gray-500" />
                )}
              </div>

              {/* Category Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-base truncate">{category.name}</CardTitle>
                  {level > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Level {level + 1}
                    </Badge>
                  )}
                  {hasChildren && (
                    <Badge variant="outline" className="text-xs">
                      {category.children.length} {category.children.length === 1 ? 'item' : 'items'}
                    </Badge>
                  )}
                </div>
                {category.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {category.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Order: {category.sort_order}</span>
                  <span>Created: {new Date(category.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddChild}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Subcategory
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mb-2">
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoryTree({ categories, onEdit, onDelete, isFiltered }: CategoryTreeProps) {
  const [selectedParent, setSelectedParent] = useState<string | null>(null)

  // Handle filtered view (flat list)
  if (isFiltered) {
    return (
      <div className="space-y-2">
        {(categories as Category[]).map((category) => (
          <Card key={category.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Folder className="h-5 w-5 text-gray-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base truncate">{category.name}</CardTitle>
                      {category.parent_id && (
                        <Badge variant="secondary" className="text-xs">
                          Subcategory
                        </Badge>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(category.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  // Handle tree view
  const categoryTree = categories as CategoryWithChildren[]

  if (categoryTree.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No categories found</h3>
          <p className="text-muted-foreground">
            Create your first category to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleAddChild = (parentId: string) => {
    setSelectedParent(parentId)
    // This will be handled by the parent component
    // For now, we'll just trigger edit with a new category that has this parent
    onEdit({ parent_id: parentId } as Category)
  }

  return (
    <div className="space-y-2">
      {categoryTree.map((category) => (
        <CategoryNode
          key={category.id}
          category={category}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={handleAddChild}
        />
      ))}
    </div>
  )
}