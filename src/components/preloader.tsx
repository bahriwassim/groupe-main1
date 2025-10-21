"use client"

import * as React from 'react';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PreloaderProps {
  isLoading?: boolean;
  progress?: number;
  message?: string;
  className?: string;
}

export const Preloader = ({
  isLoading = true,
  progress = 0,
  message = "Chargement...",
  className
}: PreloaderProps) => {
  if (!isLoading) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      "bg-gradient-to-br from-amber-50 via-white to-amber-100/50",
      "backdrop-blur-sm",
      className
    )}>
      <div className="relative flex flex-col items-center gap-8 p-8">
        {/* Logo animé */}
        <div className="relative">
          {/* Cercle de pulsation en arrière-plan */}
          <div className="absolute inset-0 -m-8 rounded-full bg-gradient-to-r from-amber-200/40 to-amber-400/40 animate-ping" />

          {/* Cercle rotatif autour du logo */}
          <div className="absolute inset-0 -m-6 rounded-full border-4 border-transparent border-t-amber-500 border-r-amber-400 animate-spin" />

          {/* Logo avec animation de zoom */}
          <div className="relative animate-pulse-slow">
            <Image
              src="/assets/logo-essoukri.jpg"
              alt="ESSOUKRI - Artisans Pâtissiers depuis 1955"
              width={200}
              height={80}
              className={cn(
                "object-contain rounded-xl",
                "shadow-[0_8px_32px_rgba(0,0,0,0.12),_0_0_20px_rgba(139,69,19,0.2)]",
                "border-2 border-amber-200/30",
                "bg-white/80 backdrop-blur-sm",
                "transition-all duration-700 ease-in-out"
              )}
              priority
            />
          </div>

          {/* Effet de brillance */}
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
          </div>
        </div>

        {/* Barre de progression */}
        <div className="w-64 space-y-3">
          <Progress
            value={progress}
            className="h-2 bg-amber-100"
          />

          {/* Message et pourcentage */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-800/80 font-medium animate-pulse">
              {message}
            </span>
            <span className="text-amber-600 font-semibold">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Points de chargement animés */}
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

// Hook personnalisé pour gérer le chargement avec progression
export const usePreloader = (isLoading: boolean = false) => {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    setProgress(0);

    // Simuler une progression
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90; // S'arrêter à 90% jusqu'à ce que les données soient vraiment chargées
        }
        // Progression plus rapide au début, plus lente vers la fin
        const increment = prev < 50 ? 10 : prev < 80 ? 5 : 2;
        return Math.min(prev + increment, 90);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isLoading]);

  const completeLoading = () => {
    setProgress(100);
  };

  return { progress, completeLoading };
};
