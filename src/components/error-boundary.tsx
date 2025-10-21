'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">Une erreur s'est produite</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Désolé, quelque chose s'est mal passé. Veuillez réessayer.
              </p>
              
              {this.state.error && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Détails de l'erreur
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recharger la page
                </Button>
                
                <Link href="/" className="w-full">
                  <Button variant="outline" className="w-full">
                    <Home className="mr-2 h-4 w-4" />
                    Retour à l'accueil
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook pour gérer les erreurs dans les composants fonctionnels
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Error handled by hook:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

// Composant d'affichage d'erreur simple
export function ErrorDisplay({ 
  error, 
  onRetry, 
  onReset 
}: { 
  error: Error; 
  onRetry?: () => void; 
  onReset?: () => void; 
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2 text-red-800">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">Erreur</span>
      </div>
      <p className="mt-2 text-sm text-red-700">{error.message}</p>
      <div className="mt-3 flex gap-2">
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Réessayer
          </Button>
        )}
        {onReset && (
          <Button size="sm" variant="outline" onClick={onReset}>
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}
