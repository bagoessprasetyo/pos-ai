'use client'

import { useState, useCallback, useEffect } from 'react'
import { z } from 'zod'
import { safeValidate } from '@/utils/validation'
import type { ValidationResult, FormState, UseFormReturn } from '@/types'

export interface UseValidationOptions<T> {
  schema: z.ZodSchema<T>
  initialData: T
  validateOnChange?: boolean
  validateOnBlur?: boolean
  debounceMs?: number
}

export function useValidation<T extends Record<string, any>>({
  schema,
  initialData,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300
}: UseValidationOptions<T>): UseFormReturn<T> {
  const [formState, setFormState] = useState<FormState<T>>({
    data: initialData,
    errors: {} as Record<keyof T, string>,
    isDirty: false,
    isValid: true,
    isSubmitting: false,
    touchedFields: new Set()
  })

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Validate a single field
  const validateField = useCallback((field: keyof T): boolean => {
    try {
      // Try to validate the full data and extract field-specific errors
      const result = safeValidate(schema, formState.data)
      const fieldError = result.errors?.find(err => err.includes(String(field)))
      
      setFormState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field]: fieldError || ''
        }
      }))

      return !fieldError
    } catch (error) {
      // Fallback for field validation
      setFormState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field]: 'Validation error'
        }
      }))
      return false
    }
  }, [schema, formState.data])

  // Validate all fields
  const validate = useCallback((): boolean => {
    const result = safeValidate(schema, formState.data)
    
    if (result.success) {
      setFormState(prev => ({
        ...prev,
        errors: {},
        isValid: true
      }))
      return true
    } else {
      const errors = {} as Record<keyof T, string>
      // Map validation errors to fields
      if (result.errors) {
        // This is a simplified error mapping - in practice, you'd want more sophisticated error parsing
        result.errors.forEach((error, index) => {
          const fieldNames = Object.keys(formState.data) as (keyof T)[]
          if (fieldNames[index]) {
            errors[fieldNames[index]] = error
          }
        })
      }
      
      setFormState(prev => ({
        ...prev,
        errors,
        isValid: false
      }))
      return false
    }
  }, [schema, formState.data])

  // Handle field changes
  const handleChange = useCallback((field: keyof T, value: any) => {
    setFormState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value
      },
      isDirty: true,
      touchedFields: new Set([...Array.from(prev.touchedFields), field])
    }))

    // Debounced validation on change
    if (validateOnChange) {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      const timer = setTimeout(() => {
        validateField(field)
      }, debounceMs)

      setDebounceTimer(timer)
    }
  }, [validateOnChange, validateField, debounceMs, debounceTimer])

  // Handle form submission
  const handleSubmit = useCallback(async (onSubmit: (data: T) => Promise<void> | void) => {
    setFormState(prev => ({ ...prev, isSubmitting: true }))

    try {
      const isValid = validate()
      if (isValid) {
        await onSubmit(formState.data)
      }
    } catch (error) {
      console.error('Form submission error:', error)
      throw error
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }))
    }
  }, [validate, formState.data])

  // Reset form
  const reset = useCallback((data?: T) => {
    setFormState({
      data: data || initialData,
      errors: {},
      isDirty: false,
      isValid: true,
      isSubmitting: false,
      touchedFields: new Set()
    })
  }, [initialData])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  // Initial validation
  useEffect(() => {
    validate()
  }, []) // Only run on mount

  return {
    data: formState.data,
    errors: formState.errors as Record<keyof T, string>,
    isDirty: formState.isDirty,
    isValid: formState.isValid,
    isSubmitting: formState.isSubmitting,
    handleChange,
    handleSubmit,
    reset,
    validate,
    validateField
  }
}

// Hook for real-time validation
export function useRealTimeValidation<T>(
  value: T,
  schema: z.ZodSchema<T>,
  debounceMs: number = 300
): {
  isValid: boolean
  errors: string[]
  isValidating: boolean
} {
  const [state, setState] = useState({
    isValid: true,
    errors: [] as string[],
    isValidating: false
  })

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    setState(prev => ({ ...prev, isValidating: true }))

    const timer = setTimeout(() => {
      const result = safeValidate(schema, value)
      setState({
        isValid: result.success,
        errors: result.success ? [] : result.errors || [],
        isValidating: false
      })
    }, debounceMs)

    setDebounceTimer(timer)

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [value, schema, debounceMs])

  return state
}

// Hook for async validation (e.g., checking uniqueness)
export function useAsyncValidation<T>(
  value: T,
  validator: (value: T) => Promise<ValidationResult<T>>,
  dependencies: any[] = [],
  debounceMs: number = 500
): {
  isValid: boolean | null
  errors: string[]
  isValidating: boolean
} {
  const [state, setState] = useState<{
    isValid: boolean | null
    errors: string[]
    isValidating: boolean
  }>({
    isValid: null,
    errors: [],
    isValidating: false
  })

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!value) {
      setState({ isValid: null, errors: [], isValidating: false })
      return
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    setState(prev => ({ ...prev, isValidating: true }))

    const timer = setTimeout(async () => {
      try {
        const result = await validator(value)
        setState({
          isValid: result.success,
          errors: result.success ? [] : result.errors || [],
          isValidating: false
        })
      } catch (error) {
        setState({
          isValid: false,
          errors: ['Validation failed'],
          isValidating: false
        })
      }
    }, debounceMs)

    setDebounceTimer(timer)

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [value, validator, debounceMs, ...dependencies])

  return state
}

// Hook for field-level validation
export function useFieldValidation<T>(
  value: T,
  validators: Array<(value: T) => string | null>,
  options: {
    validateOnChange?: boolean
    validateOnBlur?: boolean
    debounceMs?: number
  } = {}
) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300
  } = options

  const [state, setState] = useState({
    error: null as string | null,
    isValid: true,
    isTouched: false
  })

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const validateValue = useCallback((val: T) => {
    for (const validator of validators) {
      const error = validator(val)
      if (error) {
        setState(prev => ({ ...prev, error, isValid: false }))
        return false
      }
    }
    setState(prev => ({ ...prev, error: null, isValid: true }))
    return true
  }, [validators])

  const handleChange = useCallback((newValue: T) => {
    setState(prev => ({ ...prev, isTouched: true }))

    if (validateOnChange) {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      const timer = setTimeout(() => {
        validateValue(newValue)
      }, debounceMs)

      setDebounceTimer(timer)
    }
  }, [validateOnChange, validateValue, debounceMs, debounceTimer])

  const handleBlur = useCallback(() => {
    setState(prev => ({ ...prev, isTouched: true }))
    
    if (validateOnBlur) {
      validateValue(value)
    }
  }, [validateOnBlur, validateValue, value])

  // Validate on value change if already touched
  useEffect(() => {
    if (state.isTouched && validateOnChange) {
      validateValue(value)
    }
  }, [value, state.isTouched, validateOnChange, validateValue])

  return {
    error: state.error,
    isValid: state.isValid,
    isTouched: state.isTouched,
    handleChange,
    handleBlur,
    validate: () => validateValue(value)
  }
}

// Export validation helper functions
export const validationHelpers = {
  // Check if any field has errors
  hasErrors: (errors: Record<string, string>): boolean => {
    return Object.values(errors).some(error => error && error.length > 0)
  },

  // Get first error message
  getFirstError: (errors: Record<string, string>): string | null => {
    const firstError = Object.values(errors).find(error => error && error.length > 0)
    return firstError || null
  },

  // Count total errors
  getErrorCount: (errors: Record<string, string>): number => {
    return Object.values(errors).filter(error => error && error.length > 0).length
  },

  // Check if specific field is valid
  isFieldValid: (errors: Record<string, string>, field: string): boolean => {
    return !errors[field] || errors[field].length === 0
  },

  // Format validation errors for display
  formatErrors: (errors: Record<string, string>): string[] => {
    return Object.entries(errors)
      .filter(([_, error]) => error && error.length > 0)
      .map(([field, error]) => `${field}: ${error}`)
  }
}