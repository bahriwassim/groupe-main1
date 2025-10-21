'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Factory, 
  Eye,
  Calendar,
  User
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Utilise le type depuis le service pour rester aligné avec la DB
import type { ProductionOrder } from '@/lib/supabase-service';

interface ValidationStep {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  validator: string;
  date?: Date;
  comments?: string;
}

type CardOrder = ProductionOrder;

const statusConfig = {
  validation_production: { label: 'En attente validation production', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  production_validee: { label: 'Production validée', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  validation_qualite: { label: 'En attente validation hygiène', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  qualite_validee: { label: 'Approuvé (hygiène)', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  non_conforme: { label: 'Non conforme', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  en_fabrication: { label: 'En production', color: 'bg-orange-100 text-orange-800', icon: Factory },
  termine: { label: 'Terminé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  annule: { label: 'Annulé', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
  cree: { label: 'Créé', color: 'bg-gray-100 text-gray-800', icon: Clock }
} as const;

const priorityConfig = {
  low: { label: 'Basse', color: 'bg-gray-100 text-gray-800' },
  normal: { label: 'Normale', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' }
};

interface ProductionOrderCardProps {
  order: CardOrder;
}

export function ProductionOrderCard({ order }: ProductionOrderCardProps) {
  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.cree;
  };

  const getPriorityConfig = (priority: string) => {
    return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
  };

  const calculateProgress = () => {
    const statusProgress: Record<CardOrder['status'], number> = {
      cree: 0,
      validation_production: 10,
      production_validee: 20,
      validation_qualite: 40,
      qualite_validee: 60,
      non_conforme: 40,
      en_fabrication: 80,
      production_terminee: 90,
      termine: 100,
      annule: 0
    };
    return statusProgress[order.status] ?? 0;
  };

  const getStatusIcon = (status: string) => {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              {getStatusIcon(order.status)}
              {order.orderNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {(order.bcOrigins?.length || 0) === 1
                ? `BC: ${order.bcOrigins?.[0]?.orderNumber || '—'}`
                : `${order.bcOrigins?.length || 0} BC liées`} • {order.laboratory}
            </p>
            {(order.bcOrigins?.length || 0) > 1 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {order.bcOrigins?.map((bc, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {bc?.orderNumber || '—'}
                  </Badge>
                )) || []}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getPriorityConfig(order.priority).color}>
              Priorité {getPriorityConfig(order.priority).label}
            </Badge>
            <Badge className={getStatusConfig(order.status).color}>
              {getStatusConfig(order.status).label}
            </Badge>
          </div>
        </div>
        
        {/* Barre de progression */}
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progression</span>
            <span>{Math.round(calculateProgress())}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Produits avec photos */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Produits à fabriquer ({order.items.length})
          </h4>

          <div className="space-y-3">
            {order.items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2 border rounded-lg">
                {/* Informations du produit */}
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-sm truncate">{item.productName}</h5>
                  <p className="text-xs text-muted-foreground">
                    ID: {item.productId}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground italic">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Quantité */}
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {item.quantity}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.unit}
                  </div>
                </div>
              </div>
            ))}

            {/* Indicateur s'il y a plus de produits */}
            {order.items.length > 3 && (
              <div className="text-center py-2 text-xs text-muted-foreground border-t">
                +{order.items.length - 3} autre(s) produit(s)
              </div>
            )}
          </div>
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {order.createdAt.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Factory className="h-3 w-3" />
            <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} unités</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t">
          <Link href={`/production/production-orders/${order.id}`}>
            <Button className="w-full" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              Voir les détails
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
