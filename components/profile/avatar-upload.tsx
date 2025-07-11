'use client'

import { useState, useRef } from 'react'
import { Camera, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProfile } from '@/hooks/use-profile'
import { avatarUploadSchema } from '@/utils/validation'
import { toast } from 'sonner'

interface AvatarUploadProps {
  currentAvatar?: string
  userName?: string
  onAvatarChange?: (avatarUrl: string | null) => void
}

export function AvatarUpload({ currentAvatar, userName = 'User', onAvatarChange }: AvatarUploadProps) {
  const { uploadAvatar, removeAvatar, updating } = useProfile()
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = avatarUploadSchema.safeParse({ file })
    if (!validation.success) {
      toast.error(validation.error.issues[0].message)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    const avatarUrl = await uploadAvatar(file)
    if (avatarUrl) {
      onAvatarChange?.(avatarUrl)
    }
  }

  const handleRemoveAvatar = async () => {
    const success = await removeAvatar()
    if (success) {
      setPreview(null)
      onAvatarChange?.(null)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const displayAvatar = preview || currentAvatar
  const displayInitials = getInitials(userName)

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="w-24 h-24 md:w-32 md:h-32">
          <AvatarImage src={displayAvatar} alt={userName} />
          <AvatarFallback className="text-lg font-medium">
            {displayInitials}
          </AvatarFallback>
        </Avatar>
        
        {displayAvatar && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
            onClick={handleRemoveAvatar}
            disabled={updating}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
        
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
          onClick={handleUploadClick}
          disabled={updating}
        >
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      <div className="text-center space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleUploadClick}
          disabled={updating}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          {updating ? 'Uploading...' : 'Upload Photo'}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          JPG, PNG or WebP. Max size 5MB.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}