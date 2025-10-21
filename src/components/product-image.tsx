import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/supabase-storage';
import { DEFAULT_PRODUCT_IMAGE } from '@/lib/image-utils';

interface ProductImageProps {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
}

export const ProductImage = ({ 
  src, 
  alt, 
  width = 300, 
  height = 300, 
  className = "",
  sizes,
  priority = false,
  fill = false
}: ProductImageProps) => {
  const [imageSrc, setImageSrc] = useState(getImageUrl(src || ''));
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (imageSrc !== DEFAULT_PRODUCT_IMAGE) {
      setImageSrc(DEFAULT_PRODUCT_IMAGE);
      setHasError(true);
    }
  };

  const imageProps = {
    src: imageSrc,
    alt: alt,
    className: cn(
      "object-cover transition-all duration-300",
      hasError && "object-contain p-2", // Style spécial pour le logo par défaut
      className
    ),
    onError: handleError,
    sizes,
    priority
  };

  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
      />
    );
  }

  return (
    <Image
      {...imageProps}
      width={width}
      height={height}
    />
  );
};

export default ProductImage;