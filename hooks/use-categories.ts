'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import type { Category, CategoryFormData } from '@/types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const supabase = createClient()

  const fetchCategories = async () => {
    if (!currentStore) {
      setCategories([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const createCategory = async (categoryData: CategoryFormData) => {
    if (!currentStore) throw new Error('No store selected')

    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...categoryData,
        store_id: currentStore.id,
      })
      .select()
      .single()

    if (error) throw error
    await fetchCategories() // Refresh the list
    return data
  }

  const updateCategory = async (id: string, categoryData: Partial<CategoryFormData>) => {
    const { data, error } = await supabase
      .from('categories')
      .update({
        ...categoryData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    await fetchCategories() // Refresh the list
    return data
  }

  const deleteCategory = async (id: string) => {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('categories')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
    await fetchCategories() // Refresh the list
  }

  const getCategoryHierarchy = () => {
    const categoryMap = new Map<string, Category & { children: Category[] }>()
    const rootCategories: (Category & { children: Category[] })[] = []

    // Initialize all categories
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] })
    })

    // Build hierarchy
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!
      
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id)
        if (parent) {
          parent.children.push(categoryWithChildren)
        }
      } else {
        rootCategories.push(categoryWithChildren)
      }
    })

    return rootCategories
  }

  useEffect(() => {
    fetchCategories()
  }, [currentStore])

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryHierarchy,
  }
}