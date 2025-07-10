import { createClient } from './client'

const supabase = createClient()

export interface UploadResult {
  url: string
  path: string
  error?: string
}

// Upload a single file to Supabase Storage
export async function uploadFile(
  file: File,
  bucket: string,
  folder: string = '',
  fileName?: string
): Promise<UploadResult> {
  try {
    // Generate unique filename if not provided
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const finalFileName = fileName || `${timestamp}_${randomString}.${fileExtension}`
    
    // Create the full path
    const filePath = folder ? `${folder}/${finalFileName}` : finalFileName
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { url: '', path: '', error: error.message }
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      url: publicUrl,
      path: data.path,
    }
  } catch (error) {
    console.error('Upload error:', error)
    return { 
      url: '', 
      path: '', 
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

// Upload multiple files
export async function uploadFiles(
  files: File[],
  bucket: string,
  folder: string = ''
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => uploadFile(file, bucket, folder))
  return Promise.all(uploadPromises)
}

// Delete a file from Supabase Storage
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

// Delete multiple files
export async function deleteFiles(bucket: string, paths: string[]): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths)

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

// Get file URL (for existing files)
export function getFileUrl(bucket: string, path: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return publicUrl
}

// Check if file exists
export async function fileExists(bucket: string, path: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop()
      })

    return !error && data && data.length > 0
  } catch (error) {
    return false
  }
}

// Storage buckets configuration
export const STORAGE_BUCKETS = {
  PRODUCTS: 'product-images',
  CATEGORIES: 'category-images',
  AVATARS: 'avatars',
  STORES: 'store-images',
} as const

// Helper functions for product images
export const ProductImageStorage = {
  upload: (file: File, storeId: string, productId?: string) => 
    uploadFile(file, STORAGE_BUCKETS.PRODUCTS, `${storeId}${productId ? `/${productId}` : ''}`),
  
  uploadMultiple: (files: File[], storeId: string, productId?: string) =>
    uploadFiles(files, STORAGE_BUCKETS.PRODUCTS, `${storeId}${productId ? `/${productId}` : ''}`),
  
  delete: (path: string) => deleteFile(STORAGE_BUCKETS.PRODUCTS, path),
  
  deleteMultiple: (paths: string[]) => deleteFiles(STORAGE_BUCKETS.PRODUCTS, paths),
  
  getUrl: (path: string) => getFileUrl(STORAGE_BUCKETS.PRODUCTS, path),
}

// Helper functions for category images
export const CategoryImageStorage = {
  upload: (file: File, storeId: string) => 
    uploadFile(file, STORAGE_BUCKETS.CATEGORIES, storeId),
  
  delete: (path: string) => deleteFile(STORAGE_BUCKETS.CATEGORIES, path),
  
  getUrl: (path: string) => getFileUrl(STORAGE_BUCKETS.CATEGORIES, path),
}

// File validation helpers
export function validateImageFile(file: File): string | null {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return 'Only JPEG, PNG, WebP, and GIF images are allowed'
  }

  // Check file size (5MB limit)
  const maxSizeInBytes = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSizeInBytes) {
    return 'Image must be smaller than 5MB'
  }

  return null
}

export function validateImageFiles(files: File[]): string[] {
  return files.map(validateImageFile).filter(Boolean) as string[]
}

// Image resizing helper (for thumbnails)
export function resizeImage(
  file: File, 
  maxWidth: number, 
  maxHeight: number, 
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            resolve(resizedFile)
          } else {
            reject(new Error('Failed to resize image'))
          }
        },
        file.type,
        quality
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}