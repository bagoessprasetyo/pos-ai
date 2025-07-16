'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import type { 
  Table, 
  TableArea,
  TableWithArea,
  TableWithSession,
  TableAreaWithTables,
  TableInsert,
  TableUpdate,
  TableAreaInsert,
  TableAreaUpdate,
  TableStatus,
  TableShape
} from '@/types'

export function useTables() {
  const { currentStore } = useStore()
  const [tables, setTables] = useState<TableWithArea[]>([])
  const [areas, setAreas] = useState<TableAreaWithTables[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch all tables with their areas
  const fetchTables = async () => {
    if (!currentStore?.id) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('tables')
        .select(`
          *,
          area:table_areas(*)
        `)
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .order('table_number')

      if (fetchError) throw fetchError

      setTables(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables')
      console.error('Error fetching tables:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch all areas with their tables
  const fetchAreas = async () => {
    if (!currentStore?.id) return

    try {
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('table_areas')
        .select(`
          *,
          tables:tables(*)
        `)
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .order('sort_order')

      if (fetchError) throw fetchError

      setAreas(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch table areas')
      console.error('Error fetching table areas:', err)
    }
  }

  // Create a new table
  const createTable = async (tableData: Omit<TableInsert, 'store_id'>): Promise<Table | null> => {
    if (!currentStore?.id) {
      console.error('No current store found')
      return null
    }

    try {
      console.log('Creating table with data:', tableData)
      const insertData = {
        ...tableData,
        store_id: currentStore.id,
      }
      console.log('Full insert data:', insertData)

      const { data, error: createError } = await supabase
        .from('tables')
        .insert(insertData)
        .select()
        .single()

      if (createError) {
        console.error('Supabase error creating table:', createError)
        throw createError
      }

      console.log('Table created successfully:', data)
      await fetchTables()
      await fetchAreas()
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table')
      console.error('Error creating table:', err)
      return null
    }
  }

  // Create multiple tables at once
  const createTables = async (tablesData: Omit<TableInsert, 'store_id'>[]): Promise<boolean> => {
    if (!currentStore?.id) {
      console.error('No current store found')
      return false
    }

    try {
      console.log('Creating tables with data:', tablesData)
      const insertData = tablesData.map(tableData => ({
        ...tableData,
        store_id: currentStore.id,
      }))
      console.log('Full insert data:', insertData)

      const { error: createError } = await supabase
        .from('tables')
        .insert(insertData)

      if (createError) {
        console.error('Supabase error creating tables:', createError)
        throw createError
      }

      console.log('Tables created successfully')
      await fetchTables()
      await fetchAreas()
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tables')
      console.error('Error creating tables:', err)
      return false
    }
  }

  // Update a table
  const updateTable = async (tableId: string, updates: TableUpdate): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('tables')
        .update(updates)
        .eq('id', tableId)

      if (updateError) throw updateError

      await fetchTables()
      await fetchAreas()
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update table')
      console.error('Error updating table:', err)
      return false
    }
  }

  // Delete a table
  const deleteTable = async (tableId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('tables')
        .update({ is_active: false })
        .eq('id', tableId)

      if (deleteError) throw deleteError

      await fetchTables()
      await fetchAreas()
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table')
      console.error('Error deleting table:', err)
      return false
    }
  }

  // Update table status
  const updateTableStatus = async (tableId: string, status: TableStatus): Promise<boolean> => {
    return await updateTable(tableId, { status })
  }

  // Create a new table area
  const createArea = async (areaData: Omit<TableAreaInsert, 'store_id'>): Promise<TableArea | null> => {
    if (!currentStore?.id) {
      console.error('No current store found for area creation')
      return null
    }

    try {
      console.log('Creating area with data:', areaData)
      const insertData = {
        ...areaData,
        store_id: currentStore.id,
      }
      console.log('Full area insert data:', insertData)

      const { data, error: createError } = await supabase
        .from('table_areas')
        .insert(insertData)
        .select()
        .single()

      if (createError) {
        console.error('Supabase error creating area:', createError)
        throw createError
      }

      console.log('Area created successfully:', data)
      await fetchAreas()
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table area')
      console.error('Error creating table area:', err)
      return null
    }
  }

  // Update a table area
  const updateArea = async (areaId: string, updates: TableAreaUpdate): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('table_areas')
        .update(updates)
        .eq('id', areaId)

      if (updateError) throw updateError

      await fetchAreas()
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update table area')
      console.error('Error updating table area:', err)
      return false
    }
  }

  // Delete a table area
  const deleteArea = async (areaId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('table_areas')
        .update({ is_active: false })
        .eq('id', areaId)

      if (deleteError) throw deleteError

      await fetchAreas()
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table area')
      console.error('Error deleting table area:', err)
      return false
    }
  }

  // Get tables by status
  const getTablesByStatus = (status: TableStatus) => {
    return tables.filter(table => table.status === status)
  }

  // Get tables by area
  const getTablesByArea = (areaId: string) => {
    return tables.filter(table => table.area_id === areaId)
  }

  // Get available tables for party size
  const getAvailableTablesForParty = (partySize: number) => {
    return tables.filter(table => 
      table.status === 'available' &&
      table.seats >= partySize &&
      table.min_party_size <= partySize &&
      (table.max_party_size === null || table.max_party_size >= partySize)
    ).sort((a, b) => a.seats - b.seats) // Sort by smallest suitable table first
  }

  // Get table statistics
  const getTableStats = () => {
    const stats = {
      total: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      cleaning: tables.filter(t => t.status === 'cleaning').length,
      out_of_service: tables.filter(t => t.status === 'out_of_service').length,
    }

    return {
      ...stats,
      utilization_rate: stats.total > 0 ? (stats.occupied + stats.reserved) / stats.total : 0
    }
  }

  // Generate next table number
  const generateNextTableNumber = (areaId?: string) => {
    const areaPrefix = areaId ? 
      areas.find(a => a.id === areaId)?.name.charAt(0).toUpperCase() || '' : ''
    
    const existingNumbers = tables
      .filter(t => !areaId || t.area_id === areaId)
      .map(t => {
        const match = t.table_number.match(/\d+/)
        return match ? parseInt(match[0]) : 0
      })
      .filter(n => n > 0)

    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
    
    return areaPrefix + nextNumber
  }

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentStore?.id) return

    const channel = supabase
      .channel('table_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `store_id=eq.${currentStore.id}`
        },
        () => {
          fetchTables()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_areas',
          filter: `store_id=eq.${currentStore.id}`
        },
        () => {
          fetchAreas()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentStore?.id])

  // Initial fetch
  useEffect(() => {
    if (currentStore?.id) {
      fetchTables()
      fetchAreas()
    }
  }, [currentStore?.id])

  return {
    tables,
    areas,
    loading,
    error,
    
    // Table operations
    createTable,
    createTables,
    updateTable,
    deleteTable,
    updateTableStatus,
    
    // Area operations
    createArea,
    updateArea,
    deleteArea,
    
    // Utility functions
    getTablesByStatus,
    getTablesByArea,
    getAvailableTablesForParty,
    getTableStats,
    generateNextTableNumber,
    
    // Refresh functions
    refetchTables: fetchTables,
    refetchAreas: fetchAreas,
    refetch: () => Promise.all([fetchTables(), fetchAreas()])
  }
}