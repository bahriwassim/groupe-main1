import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  variant?: 'default' | 'large' | 'small' | 'hero';
}

export const Logo = ({ 
  width, 
  height, 
  className = "", 
  variant = 'default' 
}: LogoProps) => {
  // Définir les tailles selon la variante
  const sizes = {
    small: { width: 120, height: 48 },
    default: { width: 280, height: 112 },
    large: { width: 350, height: 140 },
    hero: { width: 450, height: 180 }
  };

  const currentSize = sizes[variant];
  const finalWidth = width || currentSize.width;
  const finalHeight = height || currentSize.height;

  return (
    <div className={cn(
      "logo-enhanced group transition-all duration-500 hover:scale-105",
      "filter drop-shadow-2xl hover:drop-shadow-3xl",
      variant === 'hero' && "hover:scale-110",
      className
    )}>
      <Image
        src="/assets/logo-essoukri.jpg"
        alt="ESSOUKRI - Artisans Pâtissiers depuis 1955"
        width={finalWidth}
        height={finalHeight}
        className={cn(
          "object-contain rounded-xl",
          "shadow-[0_8px_32px_rgba(0,0,0,0.12),_0_0_20px_rgba(139,69,19,0.2)]",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.18),_0_0_40px_rgba(139,69,19,0.4)]",
          "border-2 border-gradient-to-r from-amber-200/30 to-amber-300/30",
          "bg-gradient-to-br from-white/20 via-amber-50/10 to-amber-100/20",
          "backdrop-blur-sm",
          "transition-all duration-500 ease-out",
          "hover:brightness-110 hover:contrast-110 hover:saturate-110",
          "relative z-10"
        )}
        priority
        style={{
          filter: "drop-shadow(0 4px 12px rgba(139,69,19,0.2)) drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
          background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(139,69,19,0.05) 100%)"
        }}
      />
      
      {/* Effet de brillance au survol */}
      <div className="logo-shine" />
      
      {/* Effet de halo lumineux */}
      <div className={cn(
        "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100",
        "bg-gradient-radial from-amber-400/20 via-transparent to-transparent",
        "transition-opacity duration-500 ease-out",
        "-z-10 blur-xl scale-110"
      )} />
    </div>
  );
};
