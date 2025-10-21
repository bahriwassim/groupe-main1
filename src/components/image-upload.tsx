'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadProductImage } from '@/lib/supabase-storage'
import { Loader2, Upload, X } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  productId?: string
  currentImageUrl?: string
  onImageUploaded: (imageUrl: string) => void
  onImageRemoved?: () => void
}

export function ImageUpload({
  productId,
  currentImageUrl,
  onImageUploaded,
  onImageRemoved
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validation du type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image')
      return
    }

    // Validation de la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB')
      return
    }

    // Créer un aperçu
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload vers Supabase
    setIsUploading(true)
    try {
      // Générer un ID temporaire si pas de productId
      const uploadId = productId || `temp-${Date.now()}`
      const imageUrl = await uploadProductImage(file, uploadId)
      if (imageUrl) {
        onImageUploaded(imageUrl)
        setPreview(imageUrl)
      } else {
        alert('Erreur lors de l\'upload de l\'image')
        setPreview(currentImageUrl || null)
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      alert('Erreur lors de l\'upload de l\'image')
      setPreview(currentImageUrl || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onImageRemoved?.()
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <Label htmlFor="product-image">Image du produit</Label>

      <div className="relative">
        {preview ? (
          <div className="relative group">
            <div className="relative w-48 h-48 rounded-lg overflow-hidden border">
              <Image
                src={preview}
                alt="Aperçu du produit"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 192px"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={handleClick}
          >
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 text-center">
              Cliquez pour sélectionner<br />une image
            </p>
          </div>
        )}

        <Input
          ref={fileInputRef}
          id="product-image"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {!preview && (
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Upload en cours...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Choisir une image
            </>
          )}
        </Button>
      )}

      <p className="text-xs text-gray-500">
        Formats acceptés: JPG, PNG, GIF. Taille max: 5MB
      </p>
    </div>
  )
}