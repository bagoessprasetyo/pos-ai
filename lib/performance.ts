import { useCallback, useEffect, useRef, useState } from 'react'

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func(...args)
    }
  }
}

// React hook for debounced values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// React hook for debounced callbacks
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  return useCallback(
    debounce((...args: Parameters<T>) => {
      callbackRef.current(...args)
    }, delay) as T,
    [delay]
  )
}

// React hook for throttled callbacks
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  return useCallback(
    throttle((...args: Parameters<T>) => {
      callbackRef.current(...args)
    }, delay) as T,
    [delay]
  )
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        if (entry.isIntersecting) {
          setHasIntersected(true)
        }
      },
      {
        threshold: 0.1,
        ...options
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [elementRef, options])

  return { isIntersecting, hasIntersected }
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  )

  const startIndex = Math.max(0, visibleStart - overscan)
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan)

  const visibleItems = items.slice(startIndex, endIndex + 1)

  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    handleScroll
  }
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<any>(null)

  useEffect(() => {
    if ('memory' in performance) {
      const updateMemoryInfo = () => {
        setMemoryInfo((performance as any).memory)
      }

      updateMemoryInfo()
      const interval = setInterval(updateMemoryInfo, 5000) // Update every 5 seconds

      return () => clearInterval(interval)
    }
  }, [])

  return memoryInfo
}

// Image lazy loading hook
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null)
  const { isIntersecting } = useIntersectionObserver(
    { current: imageRef },
    { threshold: 0.1 }
  )

  useEffect(() => {
    if (isIntersecting && src) {
      const img = new Image()
      img.onload = () => setImageSrc(src)
      img.src = src
    }
  }, [isIntersecting, src])

  return { imageSrc, setImageRef }
}

// Batch update hook to reduce re-renders
export function useBatchedUpdates<T>(
  initialValue: T,
  batchDelay: number = 100
) {
  const [value, setValue] = useState<T>(initialValue)
  const pendingValue = useRef<T>(initialValue)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const batchedSetValue = useCallback((newValue: T | ((prev: T) => T)) => {
    if (typeof newValue === 'function') {
      pendingValue.current = (newValue as (prev: T) => T)(pendingValue.current)
    } else {
      pendingValue.current = newValue
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setValue(pendingValue.current)
    }, batchDelay)
  }, [batchDelay])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [value, batchedSetValue] as const
}

// Component performance profiler
export function usePerformanceProfiler(componentName: string) {
  const renderCount = useRef(0)
  const startTime = useRef<number>(0)

  useEffect(() => {
    renderCount.current += 1
    startTime.current = performance.now()

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime.current

      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render #${renderCount.current}: ${renderTime.toFixed(2)}ms`)
      }
    }
  })

  return {
    renderCount: renderCount.current,
    recordInteraction: (interactionName: string) => {
      const time = performance.now()
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} ${interactionName}: ${time.toFixed(2)}ms`)
      }
    }
  }
}

// Preload resources
export function preloadResource(href: string, as: string = 'fetch') {
  if (typeof document !== 'undefined') {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    document.head.appendChild(link)

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link)
      }
    }
  }
}

// Service worker utilities
export function registerServiceWorker(swPath: string = '/sw.js') {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker.register(swPath)
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  }
}

// Request idle callback hook
export function useIdleCallback(callback: () => void, deps: React.DependencyList) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(callback)
      return () => cancelIdleCallback(id)
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      const timeout = setTimeout(callback, 100)
      return () => clearTimeout(timeout)
    }
  }, deps)
}

// Bundle size analyzer (development only)
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    // This would typically be used with webpack-bundle-analyzer
    console.log('Bundle analysis should be done with webpack-bundle-analyzer')
  }
}