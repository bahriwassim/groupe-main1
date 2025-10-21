'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Factory, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  User,
  Eye
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ProductionOrder } from '@/lib/supabase-service';

interface ProductionOrderListItemProps {
  order: ProductionOrder;
}

const priorityConfig = {
  low: { label: 'Basse', color: 'bg-gray-100 text-gray-800', icon: Clock },
  normal: { label: 'Normale', color: 'bg-blue-100 text-blue-800', icon: Clock },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800', icon: AlertCircle }
};

const statusConfig = {
  validation_production: { label: 'Validation production', color: 'bg-yellow-100 text-yellow-800' },
  production_validee: { label: 'Production validée', color: 'bg-blue-100 text-blue-800' },
  validation_qualite: { label: 'En attente Hygiène', color: 'bg-yellow-100 text-yellow-800' },
  qualite_validee: { label: 'Approuvé (hygiène)', color: 'bg-blue-100 text-blue-800' },
  non_conforme: { label: 'Non conforme', color: 'bg-red-100 text-red-800' },
  en_fabrication: { label: 'En Production', color: 'bg-purple-100 text-purple-800' },
  termine: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
  annule: { label: 'Annulé', color: 'bg-gray-100 text-gray-800' },
  cree: { label: 'Créé', color: 'bg-gray-100 text-gray-800' }
};

export function ProductionOrderListItem({ order }: ProductionOrderListItemProps) {
  const getPriorityIcon = (priority: string) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Photo du produit principal */}
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={order.items[0]?.imageUrl || '/placeholder-product.jpg'}
              alt="Produit"
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>

          {/* Informations principales */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg truncate">
                Ordre #{order.orderNumber}
              </h3>
              <Badge className={getStatusConfig(order.status).color}>
                {getStatusConfig(order.status).label}
              </Badge>
              <Badge className={priorityConfig[order.priority]?.color || 'bg-gray-100 text-gray-800'}>
                {getPriorityIcon(order.priority)}
                {priorityConfig[order.priority]?.label || order.priority}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4" />
                <span>{order.laboratory}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>BC: {order.bcOrigins?.[0]?.orderNumber || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)} {order.items[0]?.unit || 'unités'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href={`/production/production-orders/${order.id}`}>
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                Voir
              </Button>
            </Link>
          </div>
        </div>

        {/* Informations supplémentaires */}
        {order.items[0]?.notes && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Notes :</strong> {order.items[0].notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
