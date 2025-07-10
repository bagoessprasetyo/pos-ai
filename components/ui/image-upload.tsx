'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  X, 
  ImageIcon, 
  Loader2, 
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateImageFile } from '@/lib/supabase/storage'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  onUpload: (files: File[]) => Promise<string[]>
  maxImages?: number
  maxSizeInMB?: number
  allowedTypes?: string[]
  className?: string
  placeholder?: string
  disabled?: boolean
}

interface UploadingImage {
  id: string
  file: File
  preview: string
  progress?: number
  error?: string
}

export function ImageUpload({
  images,
  onImagesChange,
  onUpload,
  maxImages = 5,
  maxSizeInMB = 5,
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  className,
  placeholder = 'Upload images',
  disabled = false,
}: ImageUploadProps) {
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canAddMore = images.length + uploadingImages.length < maxImages

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    // Validate each file
    fileArray.forEach(file => {
      const error = validateImageFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    })

    // Check if we would exceed max images
    const totalAfterUpload = images.length + uploadingImages.length + validFiles.length
    if (totalAfterUpload > maxImages) {
      errors.push(`Cannot upload more than ${maxImages} images`)
      const allowedCount = maxImages - images.length - uploadingImages.length
      validFiles.splice(allowedCount)
    }

    if (errors.length > 0) {
      console.warn('Upload errors:', errors)
      // You could show these errors in a toast or alert
    }

    if (validFiles.length === 0) return

    // Create preview images
    const uploadingImagesData: UploadingImage[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(2),
      file,
      preview: URL.createObjectURL(file),
    }))

    setUploadingImages(prev => [...prev, ...uploadingImagesData])

    try {
      // Upload files
      const uploadedUrls = await onUpload(validFiles)
      
      // Add successful uploads to images
      const newImages = [...images, ...uploadedUrls]
      onImagesChange(newImages)

      // Remove from uploading state
      setUploadingImages(prev => 
        prev.filter(img => !uploadingImagesData.some(upload => upload.id === img.id))
      )

      // Clean up preview URLs
      uploadingImagesData.forEach(img => URL.revokeObjectURL(img.preview))

    } catch (error) {
      console.error('Upload failed:', error)
      
      // Mark as error and keep in uploading state to show error
      setUploadingImages(prev => 
        prev.map(img => 
          uploadingImagesData.some(upload => upload.id === img.id)
            ? { ...img, error: 'Upload failed' }
            : img
        )
      )
    }
  }, [images, uploadingImages.length, maxImages, onImagesChange, onUpload])

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  const handleRemoveUploadingImage = (id: string) => {
    setUploadingImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return prev.filter(img => img.id !== id)
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && canAddMore) {
      setDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    if (disabled || !canAddMore) return
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    // Reset input value so same file can be selected again
    e.target.value = ''
  }

  const openFileDialog = () => {
    if (!disabled && canAddMore) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      {canAddMore && (
        <Card
          className={cn(
            'border-2 border-dashed cursor-pointer transition-colors',
            dragOver && 'border-primary bg-primary/5',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'hover:border-primary hover:bg-primary/5'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{placeholder}</p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max {maxImages} images, up to {maxSizeInMB}MB each
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(',')}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Image Grid */}
      {(images.length > 0 || uploadingImages.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Existing Images */}
          {images.map((imageUrl, index) => (
            <Card key={index} className="relative group aspect-square overflow-hidden">
              <img
                src={imageUrl}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveImage(index)
                  }}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Badge className="absolute top-2 left-2" variant="secondary">
                {index + 1}
              </Badge>
            </Card>
          ))}

          {/* Uploading Images */}
          {uploadingImages.map((uploadingImage) => (
            <Card key={uploadingImage.id} className="relative aspect-square overflow-hidden">
              <img
                src={uploadingImage.preview}
                alt="Uploading..."
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                {uploadingImage.error ? (
                  <div className="text-center text-white">
                    <AlertCircle className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Failed</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => handleRemoveUploadingImage(uploadingImage.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-white">
                    <Loader2 className="h-6 w-6 mx-auto mb-1 animate-spin" />
                    <p className="text-xs">Uploading...</p>
                  </div>
                )}
              </div>
            </Card>
          ))}

          {/* Add More Button */}
          {canAddMore && images.length > 0 && (
            <Card 
              className="aspect-square flex items-center justify-center border-2 border-dashed cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              onClick={openFileDialog}
            >
              <div className="text-center text-muted-foreground">
                <Plus className="h-8 w-8 mx-auto mb-1" />
                <p className="text-xs">Add More</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Image Count Info */}
      {(images.length > 0 || uploadingImages.length > 0) && (
        <p className="text-xs text-muted-foreground text-center">
          {images.length} of {maxImages} images uploaded
          {uploadingImages.length > 0 && ` (${uploadingImages.length} uploading)`}
        </p>
      )}
    </div>
  )
}