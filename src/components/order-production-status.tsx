'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Factory,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  Timer
} from 'lucide-react';
import { getProductionOrdersForOrder, type ProductionOrder } from '@/lib/supabase-service';

interface OrderProductionStatusProps {
  orderId: string;
  className?: string;
}

export function OrderProductionStatus({ orderId, className }: OrderProductionStatusProps) {
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    const loadProductionOrders = async () => {
      try {
        const orders = await getProductionOrdersForOrder(orderId);
        setProductionOrders(orders);

        // Calculer la progression globale
        if (orders.length > 0) {
          const totalOrders = orders.length;
          const completedOrders = orders.filter(po => po.status === 'termine').length;
          const inProgressOrders = orders.filter(po =>
            ['en_fabrication', 'production_terminee', 'validation_qualite', 'qualite_validee'].includes(po.status)
          ).length;

          const progress = ((completedOrders * 100) + (inProgressOrders * 50)) / totalOrders;
          setOverallProgress(Math.round(progress));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des ordres de production:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProductionOrders();

    // Auto-refresh toutes les 15 secondes pour les statuts temps réel
    const interval = setInterval(loadProductionOrders, 15000);
    return () => clearInterval(interval);
  }, [orderId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cree':
        return 'bg-gray-100 text-gray-800';
      case 'validation_production':
        return 'bg-blue-100 text-blue-800';
      case 'production_validee':
        return 'bg-cyan-100 text-cyan-800';
      case 'en_fabrication':
        return 'bg-indigo-100 text-indigo-800';
      case 'production_terminee':
        return 'bg-yellow-100 text-yellow-800';
      case 'validation_qualite':
        return 'bg-orange-100 text-orange-800';
      case 'qualite_validee':
        return 'bg-green-100 text-green-800';
      case 'termine':
        return 'bg-emerald-100 text-emerald-800';
      case 'non_conforme':
        return 'bg-red-100 text-red-800';
      case 'annule':
        return 'bg-gray-200 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'cree':
        return 'À commencer';
      case 'validation_production':
        return 'En validation production';
      case 'production_validee':
        return 'Production validée';
      case 'en_fabrication':
        return 'En fabrication';
      case 'production_terminee':
        return 'Production terminée';
      case 'validation_qualite':
        return 'En validation qualité';
      case 'qualite_validee':
        return 'Qualité validée';
      case 'termine':
        return 'Terminé';
      case 'non_conforme':
        return 'Non conforme';
      case 'annule':
        return 'Annulé';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cree':
        return <Clock className="h-3 w-3" />;
      case 'validation_production':
        return <Timer className="h-3 w-3" />;
      case 'production_validee':
        return <CheckCircle className="h-3 w-3" />;
      case 'en_fabrication':
        return <Factory className="h-3 w-3" />;
      case 'production_terminee':
        return <Package className="h-3 w-3" />;
      case 'validation_qualite':
        return <Timer className="h-3 w-3" />;
      case 'qualite_validee':
      case 'termine':
        return <CheckCircle className="h-3 w-3" />;
      case 'non_conforme':
      case 'annule':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Bon de commande</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-muted-foreground">Chargement...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (productionOrders.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Bon de commande</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground">
              Aucun ordre de fabrication créé
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Factory className="h-4 w-4" />
          Bon de commande ({productionOrders.length} OF)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progression globale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Progression globale</span>
            <span className="text-xs font-bold">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Liste des ordres de fabrication */}
        <div className="space-y-2">
          {productionOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-2 border rounded-lg bg-muted/20"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs truncate">
                  {order.orderNumber}
                </div>
                <div className="text-xs text-muted-foreground">
                  {order.laboratory}
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-xs ml-2 ${getStatusColor(order.status)}`}
              >
                {getStatusIcon(order.status)}
                <span className="ml-1">{getStatusLabel(order.status)}</span>
              </Badge>
            </div>
          ))}
        </div>

        {/* Résumé des statuts */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          <div className="grid grid-cols-2 gap-1">
            <div>
              Terminés: {productionOrders.filter(o => o.status === 'termine').length}
            </div>
            <div>
              En cours: {productionOrders.filter(o =>
                ['en_fabrication', 'production_terminee', 'validation_qualite'].includes(o.status)
              ).length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}