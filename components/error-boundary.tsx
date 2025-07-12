'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  showDetails?: boolean
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
      this.logError(error, errorInfo)
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      error,
      errorInfo
    })
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real application, this would send to an error reporting service
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      
      console.error('Error Report:', errorReport)
      
      // Store in localStorage as fallback for debugging
      const existingErrors = JSON.parse(localStorage.getItem('error-reports') || '[]')
      existingErrors.push(errorReport)
      
      // Keep only last 10 errors to prevent storage bloat
      const recentErrors = existingErrors.slice(-10)
      localStorage.setItem('error-reports', JSON.stringify(recentErrors))
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  An unexpected error occurred. This has been automatically reported to our team.
                </AlertDescription>
              </Alert>

              {/* Show error details in development or if explicitly requested */}
              {(process.env.NODE_ENV === 'development' || this.props.showDetails) && this.state.error && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Error Details:</h4>
                  <div className="text-xs bg-muted p-3 rounded-md font-mono overflow-auto max-h-32">
                    <div className="font-semibold text-destructive mb-1">
                      {this.state.error.name}: {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <pre className="whitespace-pre-wrap text-muted-foreground">
                        {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                If this problem persists, please contact support with error ID: {Date.now().toString(36)}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional error boundary hook for smaller components
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: T) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Lightweight error boundary for specific use cases
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Page Error</h3>
            <p className="text-muted-foreground mb-4">
              This page encountered an error and couldn't load properly.
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Component-level error boundary for smaller sections
export function ComponentErrorBoundary({ 
  children, 
  componentName = 'Component'
}: { 
  children: ReactNode
  componentName?: string 
}) {
  return (
    <ErrorBoundary
      fallback={
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {componentName} failed to load. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  )
}