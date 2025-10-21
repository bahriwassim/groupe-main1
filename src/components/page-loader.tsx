"use client"

import * as React from 'react';
import { Preloader, usePreloader } from '@/components/preloader';

interface PageLoaderProps {
  children: React.ReactNode;
  isLoading?: boolean;
  loadingMessage?: string;
}

/**
 * Composant wrapper pour les pages qui gère automatiquement le preloader
 * Utilisation:
 *
 * ```tsx
 * 'use client'
 *
 * export default function MyPage() {
 *   const [data, setData] = useState(null);
 *   const [isLoading, setIsLoading] = useState(true);
 *
 *   useEffect(() => {
 *     loadData().then(data => {
 *       setData(data);
 *       setIsLoading(false);
 *     });
 *   }, []);
 *
 *   return (
 *     <PageLoader isLoading={isLoading} loadingMessage="Chargement des commandes...">
 *       <div>{data && <YourContent />}</div>
 *     </PageLoader>
 *   );
 * }
 * ```
 */
export const PageLoader = ({
  children,
  isLoading = false,
  loadingMessage = "Chargement des données..."
}: PageLoaderProps) => {
  const { progress, completeLoading } = usePreloader(isLoading);

  React.useEffect(() => {
    if (!isLoading) {
      // Attendre un peu avant de compléter pour une transition fluide
      const timer = setTimeout(completeLoading, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, completeLoading]);

  return (
    <>
      <Preloader
        isLoading={isLoading}
        progress={progress}
        message={loadingMessage}
      />
      {!isLoading && children}
    </>
  );
};

/**
 * Hook personnalisé pour gérer le chargement de données avec preloader
 *
 * Utilisation:
 * ```tsx
 * export default function MyPage() {
 *   const { isLoading, setLoading, PageWrapper } = usePageLoader();
 *
 *   useEffect(() => {
 *     loadData().finally(() => setLoading(false));
 *   }, []);
 *
 *   return (
 *     <PageWrapper loadingMessage="Chargement...">
 *       <YourContent />
 *     </PageWrapper>
 *   );
 * }
 * ```
 */
export const usePageLoader = (initialLoading: boolean = true) => {
  const [isLoading, setIsLoading] = React.useState(initialLoading);
  const [loadingMessage, setLoadingMessage] = React.useState("Chargement...");

  const PageWrapper = ({ children, loadingMessage: message }: {
    children: React.ReactNode;
    loadingMessage?: string;
  }) => (
    <PageLoader
      isLoading={isLoading}
      loadingMessage={message || loadingMessage}
    >
      {children}
    </PageLoader>
  );

  return {
    isLoading,
    setLoading: setIsLoading,
    setLoadingMessage,
    PageWrapper
  };
};
