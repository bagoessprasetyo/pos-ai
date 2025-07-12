import React from 'react'
import { toast } from 'sonner'

export interface ErrorContext {
  userId?: string
  storeId?: string
  action?: string
  component?: string
  url?: string
  userAgent?: string
  timestamp?: string
}

export interface ErrorReport {
  id: string
  message: string
  stack?: string
  context: ErrorContext
  level: 'error' | 'warning' | 'info'
}

class ErrorHandler {
  private errorQueue: ErrorReport[] = []
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers()
      this.setupNetworkStatusHandlers()
    }
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      this.logError(
        new Error(event.reason?.message || 'Unhandled promise rejection'),
        { action: 'unhandled_promise_rejection' }
      )
      
      // Show user-friendly message for certain types of errors
      if (this.isNetworkError(event.reason)) {
        toast.error('Network connection problem. Please check your internet connection.')
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    })

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error)
      this.logError(
        event.error || new Error(event.message),
        { 
          action: 'global_error',
          url: event.filename,
          component: `Line ${event.lineno}:${event.colno}`
        }
      )
    })
  }

  private setupNetworkStatusHandlers() {
    window.addEventListener('online', () => {
      this.isOnline = true
      toast.success('Connection restored')
      this.retryQueuedErrors()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      toast.warning('You are offline. Some features may not work.')
    })
  }

  public logError(error: Error, context: ErrorContext = {}, level: 'error' | 'warning' | 'info' = 'error') {
    const report: ErrorReport = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      message: error.message,
      stack: error.stack,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      level
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Report:', report)
    }

    // Store locally for debugging
    this.storeErrorLocally(report)

    // Try to send to error reporting service
    if (this.isOnline) {
      this.sendErrorReport(report)
    } else {
      this.errorQueue.push(report)
    }
  }

  private storeErrorLocally(report: ErrorReport) {
    try {
      const existingErrors = JSON.parse(localStorage.getItem('error-reports') || '[]')
      existingErrors.push(report)
      
      // Keep only last 20 errors
      const recentErrors = existingErrors.slice(-20)
      localStorage.setItem('error-reports', JSON.stringify(recentErrors))
    } catch (e) {
      console.error('Failed to store error locally:', e)
    }
  }

  private async sendErrorReport(report: ErrorReport) {
    try {
      // In production, this would send to an error reporting service
      // For now, we'll just log it as a placeholder
      if (process.env.NODE_ENV === 'production') {
        // TODO: Implement actual error reporting service integration
        // await fetch('/api/errors', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(report)
        // })
      }
    } catch (e) {
      console.error('Failed to send error report:', e)
      // Queue for retry when online
      if (!this.errorQueue.find(err => err.id === report.id)) {
        this.errorQueue.push(report)
      }
    }
  }

  private retryQueuedErrors() {
    const errors = [...this.errorQueue]
    this.errorQueue = []
    
    errors.forEach(report => {
      this.sendErrorReport(report)
    })
  }

  private isNetworkError(error: any): boolean {
    if (!error) return false
    
    const networkMessages = [
      'fetch',
      'network',
      'connection',
      'timeout',
      'offline',
      'ECONNREFUSED',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED'
    ]
    
    const message = error.message?.toLowerCase() || ''
    return networkMessages.some(msg => message.includes(msg))
  }

  public handleApiError(error: any, context: ErrorContext = {}) {
    let userMessage = 'Something went wrong. Please try again.'
    
    if (this.isNetworkError(error)) {
      userMessage = 'Network error. Please check your connection and try again.'
    } else if (error?.status === 401) {
      userMessage = 'Your session has expired. Please log in again.'
    } else if (error?.status === 403) {
      userMessage = 'You don\'t have permission to perform this action.'
    } else if (error?.status === 404) {
      userMessage = 'The requested resource was not found.'
    } else if (error?.status >= 500) {
      userMessage = 'Server error. Please try again later.'
    }

    this.logError(
      error instanceof Error ? error : new Error(error?.message || 'API Error'),
      { ...context, action: 'api_error' }
    )

    toast.error(userMessage)
    return userMessage
  }

  public getStoredErrors(): ErrorReport[] {
    try {
      return JSON.parse(localStorage.getItem('error-reports') || '[]')
    } catch {
      return []
    }
  }

  public clearStoredErrors() {
    localStorage.removeItem('error-reports')
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler()

// Retry utility for async operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        errorHandler.logError(lastError, { 
          action: 'retry_failed',
          component: `max_retries_${maxRetries}`
        })
        throw lastError
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
    }
  }
  
  throw lastError!
}

// Network status hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  
  React.useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }
    
    function handleOffline() {
      setIsOnline(false)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  return isOnline
}

// Error-safe async wrapper
export function safeAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  fallback?: R,
  context?: ErrorContext
) {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args)
    } catch (error) {
      errorHandler.logError(
        error instanceof Error ? error : new Error(String(error)),
        context
      )
      return fallback
    }
  }
}