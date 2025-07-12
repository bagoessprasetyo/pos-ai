'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { errorHandler } from '@/lib/error-handler'
import type { ErrorContext, ErrorReport } from '@/lib/error-handler'
import { toast } from 'sonner'

interface GlobalErrorState {
  errors: ErrorReport[]
  isOnline: boolean
  retryCount: number
}

interface ErrorContextType {
  errors: ErrorReport[]
  isOnline: boolean
  retryCount: number
  logError: (error: Error, context?: ErrorContext) => void
  clearErrors: () => void
  retryLastOperation: () => void
  getErrorById: (id: string) => ErrorReport | undefined
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [errorState, setErrorState] = useState<GlobalErrorState>({
    errors: [],
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    retryCount: 0
  })

  const logError = useCallback((error: Error, context?: ErrorContext) => {
    errorHandler.logError(error, context)
    
    // Add to local state for UI display
    const errorReport: ErrorReport = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      message: error.message,
      stack: error.stack,
      context: context || {},
      level: 'error'
    }

    setErrorState(prev => ({
      ...prev,
      errors: [...prev.errors.slice(-9), errorReport] // Keep last 10 errors
    }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      errors: []
    }))
    errorHandler.clearStoredErrors()
  }, [])

  const retryLastOperation = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }))
    
    // This could trigger a global retry mechanism
    // For now, just show a toast
    toast.info('Retrying last operation...')
  }, [])

  const getErrorById = useCallback((id: string) => {
    return errorState.errors.find(error => error.id === id)
  }, [errorState.errors])

  // Monitor network status
  React.useEffect(() => {
    function handleOnline() {
      setErrorState(prev => ({ ...prev, isOnline: true }))
    }
    
    function handleOffline() {
      setErrorState(prev => ({ ...prev, isOnline: false }))
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const value: ErrorContextType = {
    errors: errorState.errors,
    isOnline: errorState.isOnline,
    retryCount: errorState.retryCount,
    logError,
    clearErrors,
    retryLastOperation,
    getErrorById
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  )
}

export function useError() {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

// Custom hook for handling async operations with error logging
export function useAsyncOperation() {
  const { logError } = useError()

  const executeWithErrorHandling = useCallback(
    async (
      operation: () => Promise<any>,
      context?: ErrorContext,
      onError?: (error: Error) => void
    ): Promise<any | null> => {
      try {
        return await operation()
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        logError(err, context)
        
        if (onError) {
          onError(err)
        }
        
        return null
      }
    }, 
    [logError]
  )

  return { executeWithErrorHandling }
}

// Hook for retrying failed operations
export function useRetry() {
  const { retryCount } = useError()
  
  const retryOperation = useCallback(
    async (
      operation: () => Promise<any>,
      maxRetries: number = 3
    ): Promise<any | null> => {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt === maxRetries) {
          throw lastError
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        )
      }
    }
    
    return null
    }, 
    [retryCount]
  )

  return { retryOperation }
}