import { errorHandler } from './error-handler'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  key: string
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxAge?: number // Alternative to ttl
  staleWhileRevalidate?: number // Serve stale data while fetching fresh data
  maxEntries?: number // Maximum number of entries to keep
  storage?: 'memory' | 'localStorage' | 'sessionStorage'
  prefix?: string // Prefix for storage keys
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes
  private readonly maxMemoryEntries = 100
  private readonly storagePrefix = 'pos-cache:'

  constructor() {
    // Clean up expired entries periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000) // Every minute
    }
  }

  // Get data from cache
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const storage = options.storage || 'memory'
    const fullKey = this.getFullKey(key, options.prefix)

    try {
      let entry: CacheEntry<T> | null = null

      if (storage === 'memory') {
        entry = this.memoryCache.get(fullKey) || null
      } else if (typeof window !== 'undefined') {
        const storageObj = storage === 'localStorage' ? localStorage : sessionStorage
        const cached = storageObj.getItem(fullKey)
        if (cached) {
          entry = JSON.parse(cached)
        }
      }

      if (!entry) return null

      const now = Date.now()

      // Check if expired
      if (now > entry.expiresAt) {
        this.delete(key, options)
        return null
      }

      // Check if stale but within stale-while-revalidate window
      const staleTime = options.staleWhileRevalidate || 0
      if (staleTime > 0 && now > (entry.timestamp + (options.ttl || this.defaultTTL))) {
        // Data is stale but within SWR window, return stale data
        // The caller should trigger a background refresh
        return entry.data
      }

      return entry.data
    } catch (error) {
      errorHandler.logError(
        error instanceof Error ? error : new Error('Cache get error'),
        { action: 'cache_get', component: 'cache-manager' }
      )
      return null
    }
  }

  // Set data in cache
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const storage = options.storage || 'memory'
    const ttl = options.ttl || options.maxAge || this.defaultTTL
    const fullKey = this.getFullKey(key, options.prefix)
    const now = Date.now()

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      key: fullKey
    }

    try {
      if (storage === 'memory') {
        // Manage memory cache size
        if (this.memoryCache.size >= (options.maxEntries || this.maxMemoryEntries)) {
          this.evictOldest()
        }
        this.memoryCache.set(fullKey, entry)
      } else if (typeof window !== 'undefined') {
        const storageObj = storage === 'localStorage' ? localStorage : sessionStorage
        storageObj.setItem(fullKey, JSON.stringify(entry))
      }
    } catch (error) {
      errorHandler.logError(
        error instanceof Error ? error : new Error('Cache set error'),
        { action: 'cache_set', component: 'cache-manager' }
      )
    }
  }

  // Delete from cache
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const storage = options.storage || 'memory'
    const fullKey = this.getFullKey(key, options.prefix)

    try {
      if (storage === 'memory') {
        this.memoryCache.delete(fullKey)
      } else if (typeof window !== 'undefined') {
        const storageObj = storage === 'localStorage' ? localStorage : sessionStorage
        storageObj.removeItem(fullKey)
      }
    } catch (error) {
      errorHandler.logError(
        error instanceof Error ? error : new Error('Cache delete error'),
        { action: 'cache_delete', component: 'cache-manager' }
      )
    }
  }

  // Clear all cache for a prefix
  async clear(prefix?: string): Promise<void> {
    try {
      if (prefix) {
        const fullPrefix = this.getFullKey('', prefix)
        
        // Clear memory cache
        for (const key of Array.from(this.memoryCache.keys())) {
          if (key.startsWith(fullPrefix)) {
            this.memoryCache.delete(key)
          }
        }

        // Clear storage
        if (typeof window !== 'undefined') {
          [localStorage, sessionStorage].forEach(storage => {
            const keysToRemove: string[] = []
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i)
              if (key && key.startsWith(fullPrefix)) {
                keysToRemove.push(key)
              }
            }
            keysToRemove.forEach(key => storage.removeItem(key))
          })
        }
      } else {
        // Clear all
        this.memoryCache.clear()
        if (typeof window !== 'undefined') {
          [localStorage, sessionStorage].forEach(storage => {
            const keysToRemove: string[] = []
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i)
              if (key && key.startsWith(this.storagePrefix)) {
                keysToRemove.push(key)
              }
            }
            keysToRemove.forEach(key => storage.removeItem(key))
          })
        }
      }
    } catch (error) {
      errorHandler.logError(
        error instanceof Error ? error : new Error('Cache clear error'),
        { action: 'cache_clear', component: 'cache-manager' }
      )
    }
  }

  // Check if key exists and is not expired
  async has(key: string, options: CacheOptions = {}): Promise<boolean> {
    const data = await this.get(key, options)
    return data !== null
  }

  // Get cache size
  getSize(storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): number {
    try {
      if (storage === 'memory') {
        return this.memoryCache.size
      } else if (typeof window !== 'undefined') {
        const storageObj = storage === 'localStorage' ? localStorage : sessionStorage
        let count = 0
        for (let i = 0; i < storageObj.length; i++) {
          const key = storageObj.key(i)
          if (key && key.startsWith(this.storagePrefix)) {
            count++
          }
        }
        return count
      }
      return 0
    } catch {
      return 0
    }
  }

  // Private methods
  private getFullKey(key: string, prefix?: string): string {
    const keyPrefix = prefix ? `${prefix}:` : ''
    return `${this.storagePrefix}${keyPrefix}${key}`
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    
    // Clean memory cache
    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key)
      }
    }

    // Clean localStorage (limit cleanup to avoid performance issues)
    if (typeof window !== 'undefined' && Math.random() < 0.1) { // Only 10% of the time
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < Math.min(localStorage.length, 50); i++) { // Limit to 50 keys
          const key = localStorage.key(i)
          if (key && key.startsWith(this.storagePrefix)) {
            const cached = localStorage.getItem(key)
            if (cached) {
              const entry = JSON.parse(cached)
              if (now > entry.expiresAt) {
                keysToRemove.push(key)
              }
            }
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

// Global cache manager instance
export const cache = new CacheManager()

// Cache utility functions
export function generateCacheKey(prefix: string, ...params: (string | number | boolean | null | undefined)[]): string {
  return `${prefix}:${params.filter(p => p !== null && p !== undefined).join(':')}`
}

// Cache wrapper for async functions
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    keyGenerator: (...args: T) => string
    cacheOptions?: CacheOptions
  }
) {
  return async (...args: T): Promise<R> => {
    const cacheKey = options.keyGenerator(...args)
    
    // Try to get from cache first
    const cached = await cache.get<R>(cacheKey, options.cacheOptions)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn(...args)
    await cache.set(cacheKey, result, options.cacheOptions)
    
    return result
  }
}

// React hook for cached data
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions & {
    enabled?: boolean
    refetchOnMount?: boolean
    refetchInterval?: number
  } = {}
) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    if (!options.enabled && options.enabled !== undefined) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Check cache first
      const cached = await cache.get<T>(key, options)
      if (cached !== null) {
        setData(cached)
        setLoading(false)
        return
      }

      // Fetch fresh data
      const result = await fetcher()
      await cache.set(key, result, options)
      setData(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch data')
      setError(error.message)
      errorHandler.logError(error, {
        action: 'cached_data_fetch',
        component: 'use-cached-data'
      })
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, options.enabled])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up refetch interval
  React.useEffect(() => {
    if (options.refetchInterval && options.refetchInterval > 0) {
      const interval = setInterval(fetchData, options.refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, options.refetchInterval])

  const refetch = React.useCallback(() => {
    return fetchData()
  }, [fetchData])

  const invalidate = React.useCallback(async () => {
    await cache.delete(key, options)
    return fetchData()
  }, [key, fetchData, options])

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  }
}

// Import React for the hook
import React from 'react'