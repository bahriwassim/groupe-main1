import { supabase } from './supabase'

export async function uploadProductImage(file: File, productId: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${productId}-${Date.now()}.${fileExt}`
    const filePath = `products/${fileName}`

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Erreur upload:', error)
      return null
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error)
    return null
  }
}

export async function deleteProductImage(imagePath: string): Promise<boolean> {
  try {
    // Extraire le chemin relatif de l'URL complète
    const path = imagePath.split('/storage/v1/object/public/product-images/')[1]

    const { error } = await supabase.storage
      .from('product-images')
      .remove([path])

    if (error) {
      console.error('Erreur suppression:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    return false
  }
}

export function getImageUrl(imagePath: string): string {
  if (!imagePath) return '/assets/placeholder-product.jpg'

  // Si c'est déjà une URL complète, la retourner
  if (imagePath.startsWith('http')) return imagePath

  // Sinon, construire l'URL Supabase
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(imagePath)

  return data.publicUrl
}