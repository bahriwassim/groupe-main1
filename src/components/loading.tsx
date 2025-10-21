import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}

export function LoadingTable() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="grid grid-cols-5 gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border-b last:border-b-0">
            <div className="grid grid-cols-5 gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingGrid({ columns = 4 }: { columns?: number }) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-${columns}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <LoadingGrid />
      
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <LoadingGrid columns={3} />
      </div>
    </div>
  );
}

export function LoadingSidebar() {
  return (
    <div className="w-64 border-r bg-background p-4 space-y-4">
      <div className="flex items-center justify-center py-4">
        <Skeleton className="h-12 w-32" />
      </div>
      
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      
      <div className="pt-4 border-t space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-full" />
        </div>
        
        <div className="flex items-center gap-3 p-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant de chargement pour les images
export function ImageSkeleton({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <Skeleton className={`rounded-lg ${className}`} />
  );
}

// Composant de chargement pour les boutons
export function ButtonSkeleton({ className = "h-10 w-24" }: { className?: string }) {
  return (
    <Skeleton className={`rounded-md ${className}`} />
  );
}

// Composant de chargement pour les formulaires
export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
      
      <div className="flex gap-3">
        <ButtonSkeleton className="h-10 w-24" />
        <ButtonSkeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
