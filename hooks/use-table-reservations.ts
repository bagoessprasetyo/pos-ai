'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/contexts/store-context'
import { useAuth } from '@/contexts/auth-context'
import { 
  TableReservation,
  TableSession,
  ReservationWithDetails,
  SessionWithDetails,
  TableReservationInsert,
  TableReservationUpdate,
  TableSessionInsert,
  TableSessionUpdate,
  ReservationStatus,
  SessionStatus
} from '@/types'

export function useTableReservations() {
  const { currentStore } = useStore()
  const { user } = useAuth()
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch reservations
  const fetchReservations = async (dateFrom?: string, dateTo?: string) => {
    if (!currentStore?.id) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('table_reservations')
        .select(`
          *,
          tables!inner(
            *,
            table_areas(*)
          )
        `)
        .eq('store_id', currentStore.id)

      if (dateFrom) {
        query = query.gte('reservation_time', dateFrom)
      }
      if (dateTo) {
        query = query.lte('reservation_time', dateTo)
      }

      const { data, error: fetchError } = await query
        .order('reservation_time', { ascending: true })

      if (fetchError) throw fetchError

      setReservations(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reservations')
      console.error('Error fetching reservations:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch active table sessions
  const fetchSessions = async () => {
    if (!currentStore?.id) return

    try {
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('table_sessions')
        .select(`
          *,
          tables!inner(
            *,
            table_areas(*)
          )
        `)
        .eq('store_id', currentStore.id)
        .in('status', ['active'])
        .order('seated_at', { ascending: true })

      if (fetchError) throw fetchError

      setSessions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch table sessions')
      console.error('Error fetching table sessions:', err)
    }
  }

  // Create a new reservation
  const createReservation = async (
    reservationData: Omit<TableReservationInsert, 'store_id' | 'created_by'>
  ): Promise<TableReservation | null> => {
    if (!currentStore?.id || !user?.id) return null

    try {
      const { data, error: createError } = await supabase
        .from('table_reservations')
        .insert({
          ...reservationData,
          store_id: currentStore.id,
          created_by: user.id,
        })
        .select()
        .single()

      if (createError) throw createError

      await fetchReservations()
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation')
      console.error('Error creating reservation:', err)
      return null
    }
  }

  // Update a reservation
  const updateReservation = async (
    reservationId: string, 
    updates: TableReservationUpdate
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('table_reservations')
        .update(updates)
        .eq('id', reservationId)

      if (updateError) throw updateError

      await fetchReservations()
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reservation')
      console.error('Error updating reservation:', err)
      return false
    }
  }

  // Cancel a reservation
  const cancelReservation = async (reservationId: string, reason?: string): Promise<boolean> => {
    return await updateReservation(reservationId, { 
      status: ReservationStatus.CANCELLED,
      notes: reason 
    })
  }

  // Mark reservation as no-show
  const markNoShow = async (reservationId: string): Promise<boolean> => {
    return await updateReservation(reservationId, { 
      status: ReservationStatus.NO_SHOW 
    })
  }

  // Seat a reservation (create table session)
  const seatReservation = async (
    reservationId: string,
    actualPartySize?: number
  ): Promise<TableSession | null> => {
    if (!currentStore?.id || !user?.id) return null

    try {
      // Get the reservation details
      const reservation = reservations.find(r => r.id === reservationId)
      if (!reservation) throw new Error('Reservation not found')

      // Update reservation status
      await updateReservation(reservationId, { status: ReservationStatus.SEATED })

      // Create table session
      const sessionData: Omit<TableSessionInsert, 'store_id' | 'seated_by'> = {
        table_id: reservation.table_id,
        reservation_id: reservationId,
        party_size: actualPartySize || reservation.party_size,
        estimated_duration: reservation.duration_minutes,
      }

      const session = await createSession(sessionData)
      
      // Update table status to occupied
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', reservation.table_id)

      return session
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seat reservation')
      console.error('Error seating reservation:', err)
      return null
    }
  }

  // Create a new table session (for walk-ins)
  const createSession = async (
    sessionData: Omit<TableSessionInsert, 'store_id' | 'seated_by'>
  ): Promise<TableSession | null> => {
    if (!currentStore?.id || !user?.id) return null

    try {
      const { data, error: createError } = await supabase
        .from('table_sessions')
        .insert({
          ...sessionData,
          store_id: currentStore.id,
          seated_by: user.id,
        })
        .select()
        .single()

      if (createError) throw createError

      await fetchSessions()
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table session')
      console.error('Error creating table session:', err)
      return null
    }
  }

  // Seat walk-in guests (simplified version for POS)
  const seatGuests = async (
    tableId: string,
    guestData: {
      party_size: number
      customer_name?: string
      notes?: string
    }
  ): Promise<boolean> => {
    if (!currentStore?.id || !user?.id) return false

    try {
      // Create table session
      const sessionData: Omit<TableSessionInsert, 'store_id' | 'seated_by'> = {
        table_id: tableId,
        party_size: guestData.party_size,
        // customer_name is not part of TableSessionInsert type, removing it
        notes: guestData.notes || null,
        estimated_duration: 0
      }

      const session = await createSession(sessionData)
      if (!session) return false
      
      // Update table status to occupied
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', tableId)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seat guests')
      console.error('Error seating guests:', err)
      return false
    }
  }

  // Update a table session
  const updateSession = async (
    sessionId: string, 
    updates: TableSessionUpdate
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('table_sessions')
        .update(updates)
        .eq('id', sessionId)

      if (updateError) throw updateError

      await fetchSessions()
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update table session')
      console.error('Error updating table session:', err)
      return false
    }
  }

  // Clear/complete a table session
  const clearTable = async (sessionId: string, status: SessionStatus = SessionStatus.COMPLETED): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const session = sessions.find(s => s.id === sessionId)
      if (!session) throw new Error('Session not found')

      // Update session
      await updateSession(sessionId, {
        status,
        // cleared_by: user.id,
        // cleared_at: new Date().toISOString(),
      })

      // Update table status
      await supabase
        .from('tables')
        .update({ status: 'cleaning' })
        .eq('id', session.table_id)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear table')
      console.error('Error clearing table:', err)
      return false
    }
  }

  // Mark table as ready after cleaning
  const markTableReady = async (tableId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', tableId)

      if (updateError) throw updateError

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark table as ready')
      console.error('Error marking table as ready:', err)
      return false
    }
  }

  // Get reservations by status
  const getReservationsByStatus = (status: ReservationStatus) => {
    return reservations.filter(reservation => reservation.status === status)
  }

  // Get reservations by date
  const getReservationsByDate = (date: string) => {
    return reservations.filter(reservation => 
      reservation.reservation_time.startsWith(date)
    )
  }

  // Get upcoming reservations (next 2 hours)
  const getUpcomingReservations = () => {
    const now = new Date()
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    
    return reservations.filter(reservation => {
      const reservationTime = new Date(reservation.reservation_time)
      return reservationTime >= now && 
             reservationTime <= twoHoursFromNow &&
             ['pending', 'confirmed'].includes(reservation.status)
    })
  }

  // Check for table conflicts
  const checkTableConflict = (
    tableId: string, 
    startTime: string, 
    duration: number,
    excludeReservationId?: string
  ) => {
    const start = new Date(startTime)
    const end = new Date(start.getTime() + duration * 60 * 1000)
    
    return reservations.some(reservation => {
      if (reservation.id === excludeReservationId) return false
      if (reservation.table_id !== tableId) return false
      if (['cancelled', 'no_show', 'completed'].includes(reservation.status)) return false
      
      const resStart = new Date(reservation.reservation_time)
      const resEnd = new Date(resStart.getTime() + reservation.duration_minutes * 60 * 1000)
      
      return start < resEnd && end > resStart
    })
  }

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentStore?.id) return

    const channel = supabase
      .channel('reservation_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_reservations',
          filter: `store_id=eq.${currentStore.id}`
        },
        () => {
          fetchReservations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_sessions',
          filter: `store_id=eq.${currentStore.id}`
        },
        () => {
          fetchSessions()
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
      fetchReservations()
      fetchSessions()
    }
  }, [currentStore?.id])

  return {
    reservations,
    sessions,
    loading,
    error,
    
    // Reservation operations
    createReservation,
    updateReservation,
    cancelReservation,
    markNoShow,
    seatReservation,
    
    // Session operations
    createSession,
    seatGuests,
    updateSession,
    clearTable,
    markTableReady,
    
    // Utility functions
    getReservationsByStatus,
    getReservationsByDate,
    getUpcomingReservations,
    checkTableConflict,
    
    // Refresh functions
    refetchReservations: fetchReservations,
    refetchSessions: fetchSessions,
    refetch: () => Promise.all([fetchReservations(), fetchSessions()])
  }
}