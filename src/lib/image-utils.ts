/**
 * Utilitaires pour la gestion des images de produits
 */

export const DEFAULT_PRODUCT_IMAGE = '/assets/logo-essoukri.jpg';

/**
 * Retourne l'URL de l'image du produit ou l'image par défaut
 */
export function getProductImageUrl(imageUrl?: string): string {
  // Si l'image est manquante, cassée, ou est une URL placeholder
  if (!imageUrl || 
      imageUrl.includes('picsum.photos') || 
      imageUrl.includes('placeholder') ||
      imageUrl.trim() === '') {
    return DEFAULT_PRODUCT_IMAGE;
  }
  
  return imageUrl;
}

/**
 * Vérifie si une image est l'image par défaut
 */
export function isDefaultImage(imageUrl: string): boolean {
  return imageUrl === DEFAULT_PRODUCT_IMAGE;
}

/**
 * Props pour le composant Image des produits
 */
export interface ProductImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallback?: string;
}

/**
 * Gère les erreurs de chargement d'image
 */
export function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.src !== DEFAULT_PRODUCT_IMAGE) {
    img.src = DEFAULT_PRODUCT_IMAGE;
  }
}