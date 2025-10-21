// Module d'optimisation des performances
import React from 'react';

// Fonction de debounce pour optimiser les recherches
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Fonction de throttle pour limiter la fréquence d'exécution
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Fonction de memoization simple
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Fonction pour optimiser le rendu des listes
export function optimizeListRendering<T>(
  items: T[],
  keyExtractor: (item: T, index: number) => string | number,
  chunkSize: number = 50
): { items: T[]; hasMore: boolean; total: number } {
  return {
    items: items.slice(0, chunkSize),
    hasMore: items.length > chunkSize,
    total: items.length
  };
}

// Fonction pour optimiser les images
export function optimizeImageUrl(
  url: string,
  width: number,
  height: number,
  quality: number = 80
): string {
  // Si c'est une image Picsum, on peut optimiser
  if (url.includes('picsum.photos')) {
    return `${url}/${width}/${height}?quality=${quality}`;
  }
  
  return url;
}

// Fonction pour précharger les images
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// Fonction pour optimiser le stockage local
export function optimizeLocalStorage(
  key: string,
  data: any,
  maxSize: number = 5 * 1024 * 1024 // 5MB
): boolean {
  try {
    const serialized = JSON.stringify(data);
    
    if (serialized.length > maxSize) {
      console.warn(`Data for key "${key}" is too large (${serialized.length} bytes)`);
      return false;
    }
    
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

// Fonction pour nettoyer le cache
export function clearCache(): void {
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
}

// Fonction pour mesurer les performances
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`${name} took ${(end - start).toFixed(2)}ms`);
  return result;
}

// Hook pour optimiser les re-renders
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return React.useCallback(callback, deps);
}

// Hook pour optimiser les valeurs
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return React.useMemo(factory, deps);
}

// Fonction pour optimiser les requêtes API
export function createApiCache<T>(
  ttl: number = 5 * 60 * 1000 // 5 minutes
) {
  const cache = new Map<string, { data: T; timestamp: number }>();
  
  return {
    get: (key: string): T | null => {
      const item = cache.get(key);
      if (!item) return null;
      
      if (Date.now() - item.timestamp > ttl) {
        cache.delete(key);
        return null;
      }
      
      return item.data;
    },
    
    set: (key: string, data: T): void => {
      cache.set(key, { data, timestamp: Date.now() });
    },
    
    clear: (): void => {
      cache.clear();
    },
    
    size: (): number => {
      return cache.size;
    }
  };
}

// Fonction pour optimiser les animations
export function optimizeAnimation(
  element: HTMLElement,
  properties: string[]
): void {
  // Utiliser transform et opacity pour de meilleures performances
  element.style.willChange = properties.join(', ');
  
  // Nettoyer après l'animation
  const cleanup = () => {
    element.style.willChange = 'auto';
  };
  
  // Attendre la fin de l'animation
  element.addEventListener('transitionend', cleanup, { once: true });
  element.addEventListener('animationend', cleanup, { once: true });
}

// Fonction pour optimiser le scroll
export function optimizeScroll(
  element: HTMLElement,
  callback: (event: Event) => void,
  options: { passive?: boolean; throttle?: number } = {}
): () => void {
  const { passive = true, throttle: throttleMs = 16 } = options;
  
  const throttledCallback = throttle(callback, throttleMs);
  
  element.addEventListener('scroll', throttledCallback, { passive });
  
  return () => {
    element.removeEventListener('scroll', throttledCallback);
  };
}

// Fonction pour optimiser la recherche
export function createSearchIndex<T>(
  items: T[],
  searchFields: (keyof T)[]
): (query: string) => T[] {
  const index = new Map<string, T[]>();
  
  // Créer l'index
  items.forEach(item => {
    searchFields.forEach(field => {
      const value = String(item[field]).toLowerCase();
      const words = value.split(/\s+/);
      
      words.forEach(word => {
        if (word.length < 2) return;
        
        if (!index.has(word)) {
          index.set(word, []);
        }
        
        if (!index.get(word)!.includes(item)) {
          index.get(word)!.push(item);
        }
      });
    });
  });
  
  return (query: string) => {
    if (!query.trim()) return items;
    
    const words = query.toLowerCase().split(/\s+/);
    const results = new Map<T, number>();
    
    words.forEach(word => {
      if (word.length < 2) return;
      
      const matches = index.get(word) || [];
      matches.forEach(item => {
        results.set(item, (results.get(item) || 0) + 1);
      });
    });
    
    return Array.from(results.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([item]) => item);
  };
}
