'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRole } from '@/hooks/use-role';
import {
  Receipt,
  User,
  Calendar,
  Package,
  Eye,
  EyeOff,
  Clock,
  MapPin
} from 'lucide-react';
import { getLinkedOrders } from '@/lib/supabase-service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LinkedOrdersViewerProps {
  productionOrderId: string;
}

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  hidePrice?: boolean;
}

const OrderDetailsDialog = ({ isOpen, onClose, order, hidePrice }: OrderDetailsDialogProps) => {
  if (!order) return null;

  const statusColors = {
    'Saisi': 'bg-gray-100 text-gray-800',
    'Validé': 'bg-blue-100 text-blue-800',
    'En fabrication': 'bg-yellow-100 text-yellow-800',
    'Terminé': 'bg-green-100 text-green-800',
    'Annulé': 'bg-red-100 text-red-800',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Bon de Commande {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations client */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations Client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{order.clients?.name || 'Client non défini'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    <span>BC: {order.order_number}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Livraison: {format(new Date(order.delivery_date), 'dd/MM/yyyy', { locale: fr })}</span>
                  </p>
                  {order.delivery_time && (
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Heure: {order.delivery_time}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statut et totaux */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Détails Commande</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge
                    variant="secondary"
                    className={statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}
                  >
                    {order.status}
                  </Badge>
                </div>
                {!hidePrice && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-medium">{order.total?.toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Restant à payer</p>
                      <p className="font-medium">{order.remaining?.toFixed(2)} €</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Produits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Produits ({order.order_items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.products?.name || 'Produit non défini'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.products?.unit || 'unité'}
                      </p>
                    </div>
                    {!hidePrice && (
                      <div className="text-right">
                        <p className="font-medium">{item.total?.toFixed(2)} €</p>
                        <p className="text-sm text-muted-foreground">
                          {item.unit_price?.toFixed(2)} €/{item.products?.unit || 'u'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function LinkedOrdersViewer({ productionOrderId }: LinkedOrdersViewerProps) {
  const { role } = useRole();
  const [linkedOrders, setLinkedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const canViewDetails = role === 'Quality' || role === 'Admin';
  const hidePrice = role === 'Quality';

  useEffect(() => {
    const fetchLinkedOrders = async () => {
      setLoading(true);
      try {
        console.log('🔍 Chargement BC liés pour OF:', productionOrderId);
        const orders = await getLinkedOrders(productionOrderId);
        console.log('📊 BC liés récupérés:', orders.length, orders);
        setLinkedOrders(orders);
      } catch (error) {
        console.error('Erreur lors de la récupération des BC liés:', error);
        setLinkedOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (productionOrderId) {
      fetchLinkedOrders();
    }
  }, [productionOrderId, refreshKey]);

  const refreshOrders = () => {
    setRefreshKey(prev => prev + 1);
  };

  const statusColors = {
    'Saisi': 'bg-gray-100 text-gray-800',
    'Validé': 'bg-blue-100 text-blue-800',
    'En fabrication': 'bg-yellow-100 text-yellow-800',
    'Terminé': 'bg-green-100 text-green-800',
    'Annulé': 'bg-red-100 text-red-800',
  };

  if (!canViewDetails) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Bons de Commande liés ({linkedOrders.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refreshOrders}>
            Actualiser
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Chargement des commandes...</p>
              </div>
            </div>
          ) : linkedOrders.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Aucun bon de commande lié à cet ordre de fabrication</p>
              <p className="text-xs text-muted-foreground mt-2">ID OF: {productionOrderId}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{order.order_number}</h4>
                      <Badge
                        variant="secondary"
                        className={statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <User className="w-3 h-3 inline mr-1" />
                      {order.clients?.name || 'Client non défini'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Livraison: {format(new Date(order.delivery_date), 'dd/MM/yyyy', { locale: fr })}
                      {order.delivery_time && ` à ${order.delivery_time}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <Package className="w-3 h-3 inline mr-1" />
                      {order.order_items?.length || 0} produit(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hidePrice && (
                      <div className="text-right mr-4">
                        <p className="font-medium">{order.total?.toFixed(2)} €</p>
                        <p className="text-sm text-muted-foreground">
                          Reste: {order.remaining?.toFixed(2)} €
                        </p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {hidePrice ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                      Détails
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <OrderDetailsDialog
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          hidePrice={hidePrice}
        />
      )}
    </div>
  );
}