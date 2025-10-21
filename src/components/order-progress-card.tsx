'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Factory,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';
import type { ProductionOrder } from '@/lib/supabase-service';

interface OrderProgressCardProps {
  order: Order;
  relatedProductionOrders?: ProductionOrder[];
  onViewDetails?: () => void;
  hidePrice?: boolean;
}

export function OrderProgressCard({
  order,
  relatedProductionOrders = [],
  onViewDetails,
  hidePrice = false
}: OrderProgressCardProps) {
  const [overallProgress, setOverallProgress] = useState(0);

  // Calculer la progression globale basée sur les ordres de fabrication
  useEffect(() => {
    if (relatedProductionOrders.length === 0) {
      setOverallProgress(0);
      return;
    }

    const totalOrders = relatedProductionOrders.length;
    const completedOrders = relatedProductionOrders.filter(po =>
      po.status === 'termine'
    ).length;
    const inProgressOrders = relatedProductionOrders.filter(po =>
      ['en_fabrication', 'validation_qualite', 'qualite_validee'].includes(po.status)
    ).length;

    // Calculer le pourcentage de progression
    let progress = 0;
    if (totalOrders > 0) {
      progress = ((completedOrders * 100) + (inProgressOrders * 50)) / totalOrders;
    }

    setOverallProgress(Math.round(progress));
  }, [relatedProductionOrders]);

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'Saisi':
        return 'bg-gray-100 text-gray-800';
      case 'Validé':
        return 'bg-blue-100 text-blue-800';
      case 'En fabrication':
        return 'bg-yellow-100 text-yellow-800';
      case 'Terminé':
        return 'bg-green-100 text-green-800';
      case 'Annulé':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = () => {
    if (overallProgress >= 80) return 'bg-green-500';
    if (overallProgress >= 50) return 'bg-yellow-500';
    if (overallProgress >= 20) return 'bg-orange-500';
    return 'bg-gray-300';
  };

  const getProgressIcon = () => {
    if (overallProgress >= 100) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (overallProgress >= 50) return <Factory className="h-5 w-5 text-yellow-500" />;
    if (overallProgress > 0) return <Clock className="h-5 w-5 text-orange-500" />;
    return <AlertCircle className="h-5 w-5 text-gray-400" />;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
          </div>
          <Badge className={cn("px-2 py-1", getOrderStatusColor(order.status))}>
            {order.status}
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground">
          Livraison: {format(order.deliveryDate, 'dd/MM/yyyy')}
          {order.deliveryTime && ` à ${order.deliveryTime}`}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progression globale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getProgressIcon()}
              <span className="text-sm font-medium">Progression de production</span>
            </div>
            <span className="text-sm font-bold">{overallProgress}%</span>
          </div>

          <Progress
            value={overallProgress}
            className="h-2"
            // className={cn("h-2", getProgressColor())}
          />

          {relatedProductionOrders.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {relatedProductionOrders.filter(po => po.status === 'termine').length} sur {relatedProductionOrders.length} ordres de fabrication terminés
            </div>
          )}
        </div>

        {/* Détails des produits avec progression individuelle */}
        <div className="space-y-3">
          <h5 className="font-medium text-sm">Produits:</h5>
          {order.items.slice(0, 3).map((item, index) => {
            // Trouver l'ordre de production correspondant à ce produit
            const relatedPO = relatedProductionOrders.find(po =>
              po.items.some(poi => poi.productId === item.productId)
            );

            const itemProgress = relatedPO ? (
              relatedPO.status === 'termine' ? 100 :
              ['en_fabrication', 'validation_qualite', 'qualite_validee'].includes(relatedPO.status) ? 50 : 0
            ) : 0;

            return (
              <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {item.description || `Produit ${item.productId}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Quantité: {item.quantity}
                  </div>

                  {/* Barre de progression individuelle */}
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={itemProgress} className="h-1 flex-1" />
                    <span className="text-xs font-medium w-8">{itemProgress}%</span>
                  </div>
                </div>

                {!hidePrice && (
                  <div className="text-right ml-2">
                    <div className="text-sm font-bold">
                      {item.total.toFixed(2)} TND
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {order.items.length > 3 && (
            <div className="text-xs text-muted-foreground text-center">
              +{order.items.length - 3} autres produits
            </div>
          )}
        </div>

        {/* Total et actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          {!hidePrice && (
            <div className="text-lg font-bold">
              Total: {order.total.toFixed(2)} TND
            </div>
          )}

          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="ml-auto"
            >
              <Eye className="h-4 w-4 mr-2" />
              Voir détails
            </Button>
          )}
        </div>

        {/* Informations sur les ordres de fabrication liés */}
        {relatedProductionOrders.length > 0 && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
            <div className="font-medium text-blue-900">
              Ordres de fabrication liés:
            </div>
            {relatedProductionOrders.slice(0, 2).map(po => (
              <div key={po.id} className="flex items-center justify-between text-blue-800">
                <span>{po.orderNumber}</span>
                <Badge variant="outline" className="text-xs">
                  {po.status}
                </Badge>
              </div>
            ))}
            {relatedProductionOrders.length > 2 && (
              <div className="text-blue-700">
                +{relatedProductionOrders.length - 2} autres OF
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}