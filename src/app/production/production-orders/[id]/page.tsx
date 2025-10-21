'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Factory,
  FileText,
  Calendar,
  User,
  Shield,
  Scale,
  Eye,
  Printer,
  X
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getProductionOrders, updateProductionOrderStatus, getOrders, getClients, type ProductionOrder } from '@/lib/supabase-service';
import { ProductValidation } from '@/components/product-validation';
import { LinkedOrdersViewer } from '@/components/linked-orders-viewer';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/use-role';
import { OrderProgressCard } from '@/components/order-progress-card';
import { format } from 'date-fns';
import { type ProductionOrderItem } from '@/lib/supabase-service';

const statusConfig = {
  pending_quality: { label: 'En attente validation qualité', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  pending_quantity: { label: 'En attente validation quantité', color: 'bg-blue-100 text-blue-800', icon: Clock },
  approved: { label: 'Approuvé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  in_production: { label: 'En production', color: 'bg-orange-100 text-orange-800', icon: Factory },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-800', icon: CheckCircle }
};

const statusColors = {
  Saisi: 'bg-gray-200 text-gray-800 hover:bg-gray-200',
  Validé: 'bg-blue-200 text-blue-800 hover:bg-blue-200',
  'En fabrication': 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200',
  Terminé: 'bg-green-200 text-green-800 hover:bg-green-200',
  Annulé: 'bg-red-200 text-red-800 hover:bg-red-200',
};

const getPaymentTypeLabel = (type?: string) => {
  switch (type) {
    case 'virement': return 'Virement';
    case 'espece': return 'Espèce';
    case 'especes': return 'Espèces';
    case 'cheque': return 'Chèque';
    case 'carte': return 'Carte bancaire';
    default: return 'Espèce';
  }
};

const priorityConfig = {
  low: { label: 'Basse', color: 'bg-gray-100 text-gray-800' },
  normal: { label: 'Normale', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' }
};

export default function ProductionOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBCDialogOpen, setIsBCDialogOpen] = useState(false);
  const [relatedOrders, setRelatedOrders] = useState<any[]>([]);
  const [relatedClients, setRelatedClients] = useState<any[]>([]);

  const { toast } = useToast();
  const { role } = useRole();

  useEffect(() => {
    const load = async () => {
      try {
        if (!params.id) return;
        const orders = await getProductionOrders();
        const found = orders.find(o => o.id === params.id);
        if (found) {
          setOrder(found);

          // Charger les BC liés si l'utilisateur est qualité
          if (role === 'Quality') {
            const [ordersData, clientsData] = await Promise.all([
              getOrders(),
              getClients()
            ]);

            // Filtrer les commandes liées à cet ordre de production
            // Support des formats bcOrigins (camelCase) et bc_origins (snake_case)
            const bcOrigins = found.bcOrigins || found.bc_origins || [];
            const relatedOrderIds = bcOrigins.map((bc: any) => {
              if (typeof bc === 'string') return bc;
              return bc.orderId || bc.order_id || bc.id;
            }).filter(Boolean);

            const linkedOrders = ordersData.filter(o => relatedOrderIds.includes(o.id));

            setRelatedOrders(linkedOrders);
            setRelatedClients(clientsData);
          }
        } else {
          router.push('/production/production-orders');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, router, role]);

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Ordre non trouvé</h1>
          <p className="text-muted-foreground mt-2">
            L'ordre de fabrication demandé n'existe pas.
          </p>
          <Link href="/production/production-orders">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux ordres
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_quality;
  };

  const getPriorityConfig = (priority: string) => {
    return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getValidationStatus = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      default:
        return 'En attente';
    }
  };

  const calculateProgress = () => {
    if (!order) return 0;
    const progressMap: Record<ProductionOrder['status'], number> = {
      cree: 5,
      validation_production: 15,
      production_validee: 30,
      validation_qualite: 50,
      qualite_validee: 70,
      non_conforme: 25,
      en_fabrication: 85,
      production_terminee: 95,
      termine: 100,
      annule: 0
    };
    return progressMap[order.status] ?? 0;
  };

  const handlePrint = () => {
    window.print();
  };

  const openBCDialog = () => {
    setIsBCDialogOpen(true);
  };

  const getClientName = (clientId: string) => {
    return relatedClients.find(c => c.id === clientId)?.name || 'Client inconnu';
  };


  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* En-tête avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/production/production-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux ordres
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ordre de Fabrication</h1>
            <p className="text-muted-foreground mt-1">
              {order.orderNumber} - {order.laboratory}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">N° Ordre</label>
                  <p className="text-lg font-semibold">{order.orderNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bon de Commande</label>
                  <p className="text-lg font-semibold">
                    {(() => {
                      const bcOrigins = order.bcOrigins || order.bc_origins || [];
                      if (bcOrigins.length === 0) {
                        return 'Aucun BC lié';
                      }
                      if (bcOrigins.length === 1) {
                        const bc = bcOrigins[0] as any;
                        return bc.orderNumber || bc.order_number || bc.number || 'BC ' + (bc.id ? bc.id.substring(0, 8) : '');
                      }
                      return `${bcOrigins.length} BC liés`;
                    })()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Laboratoire</label>
                  <p className="text-lg font-semibold">{order.laboratory}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Créé le</label>
                  <p className="text-lg font-semibold">
                    {order.createdAt.toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statut et priorité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Statut et priorité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const config = getStatusConfig(order.status);
                    const Icon = config.icon;
                    return (
                      <Badge className={config.color}>
                        <Icon className="mr-1 h-4 w-4" />
                        {config.label}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const config = getPriorityConfig(order.priority);
                    return (
                      <Badge className={config.color}>
                        Priorité {config.label}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
              
              {/* Barre de progression */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progression des validations</span>
                  <span>{Math.round(calculateProgress())}%</span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Produits à fabriquer avec photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Produits à fabriquer
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {order.items.length} produit(s) • {order.items.reduce((s, i) => s + (i.quantity || 0), 0)} unité(s) au total
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {order.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      {/* Image du produit */}
                      <div
                        className={`relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-muted ${
                          (role === 'Quality')
                            ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all'
                            : ''
                        }`}
                        onClick={() => {
                          if (role === 'Quality') {
                            openBCDialog();
                          }
                        }}
                        title={
                          (role === 'Quality')
                            ? "Cliquez pour voir les Bons de Commande liés"
                            : undefined
                        }
                      >
                        <Image
                          src={item.imageUrl || '/logo-essoukri.jpg'}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="96px"
                          onError={(e) => {
                            console.log('🖼️ Image error for product:', item.productName, item.imageUrl);
                            const target = e.target as HTMLImageElement;
                            target.src = '/logo-essoukri.jpg';
                          }}
                        />
                        {(role === 'Quality') && (
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center">
                            <Eye className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>

                      {/* Informations du produit */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{item.productName}</h3>
                            <p className="text-sm text-muted-foreground">
                              ID: {item.productId || 'ID non défini'}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-blue-600 mt-1">
                                📝 {item.notes}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {item.quantity}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.unit}
                            </div>
                          </div>
                        </div>
                        
                        {/* Instructions */}
                        {item.notes && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <label className="text-sm font-medium text-muted-foreground">
                              Instructions spéciales:
                            </label>
                            <p className="text-sm mt-1">{item.notes}</p>
                          </div>
                        )}

                        {/* Statuts de validation par produit */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {/* Statut Production */}
                          {(role === 'Production' || role === 'Quality') && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Production:</span>
                              <Badge
                                variant="secondary"
                                className={{
                                  approved: 'bg-green-100 text-green-800',
                                  rejected: 'bg-red-100 text-red-800',
                                  pending: 'bg-yellow-100 text-yellow-800',
                                  null: 'bg-yellow-100 text-yellow-800',
                                  undefined: 'bg-yellow-100 text-yellow-800'
                                }[item.productionStatus || 'pending']}
                              >
                                {{
                                  approved: 'Validé',
                                  rejected: 'Rejeté',
                                  pending: 'En attente',
                                  null: 'En attente',
                                  undefined: 'En attente'
                                }[item.productionStatus || 'pending']}
                              </Badge>
                              {item.quantityProduced && (
                                <span className="text-xs text-muted-foreground">({item.quantityProduced} produit)</span>
                              )}
                            </div>
                          )}

                          {/* Statut Qualité */}
                          {(role === 'Quality' || role === 'Production') && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Qualité:</span>
                              <Badge
                                variant="secondary"
                                className={{
                                  approved: 'bg-green-100 text-green-800',
                                  rejected: 'bg-red-100 text-red-800',
                                  pending: 'bg-yellow-100 text-yellow-800',
                                  null: 'bg-yellow-100 text-yellow-800',
                                  undefined: 'bg-yellow-100 text-yellow-800'
                                }[item.qualityStatus || 'pending']}
                              >
                                {{
                                  approved: 'Validé',
                                  rejected: 'Rejeté',
                                  pending: 'En attente',
                                  null: 'En attente',
                                  undefined: 'En attente'
                                }[item.qualityStatus || 'pending']}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Les validations par produit se font via le composant ProductValidation en bas de page */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Résumé */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total produits</span>
                  <span className="font-semibold">{order.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantité totale</span>
                  <span className="font-semibold">{order.items.reduce((s, i) => s + (i.quantity || 0), 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <Badge className={getStatusConfig(order.status).color}>
                    {getStatusConfig(order.status).label}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priorité</span>
                  <Badge className={getPriorityConfig(order.priority).color}>
                    {getPriorityConfig(order.priority).label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations pour l'utilisateur */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                {role === 'Production' && (
                  <>
                    <p>✅ <strong>Validation produit par produit requise</strong></p>
                    <p>Utilisez la section "Validation par produit" ci-dessous pour valider chaque produit individuellement.</p>
                    <p>Le statut global de l'ordre sera mis à jour automatiquement une fois tous les produits validés.</p>
                  </>
                )}
                {role === 'Quality' && (
                  <>
                    <p>🔍 <strong>Contrôle qualité produit par produit</strong></p>
                    <p>Utilisez la section "Validation par produit" ci-dessous pour contrôler la qualité de chaque produit.</p>
                    <p>Le statut global de l'ordre sera mis à jour automatiquement une fois tous les produits validés.</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Validation par produit pour rôles Production et Quality */}
          {(role === 'Production' || role === 'Quality') && (
            <ProductValidation
              orderId={order.id}
              items={order.items}
              orderStatus={order.status}
              onUpdate={() => {
                // Recharger les données de l'ordre
                const fetchOrder = async () => {
                  const orders = await getProductionOrders();
                  const updated = orders.find(o => o.id === order.id);
                  if (updated) setOrder(updated);
                };
                fetchOrder();
              }}
            />
          )}

          {/* Visualisation des BC liés pour le rôle Quality */}
          {role === 'Quality' && (
            <LinkedOrdersViewer productionOrderId={order.id} />
          )}
        </div>
      </div>


      {/* Modal BC pour utilisateurs qualité */}
      <Dialog open={isBCDialogOpen} onOpenChange={setIsBCDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Bons de Commande liés - {order?.orderNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {relatedOrders.length > 0 ? (
              relatedOrders.map((relatedOrder) => (
                <OrderProgressCard
                  key={relatedOrder.id}
                  order={relatedOrder}
                  relatedProductionOrders={[order]} // Passer l'ordre de production actuel
                  hidePrice={role === 'Quality'} // Masquer les prix pour Quality
                  onViewDetails={() => {
                    // Optionnel: ouvrir les détails de la commande
                    window.open(`/orders/${relatedOrder.id}`, '_blank');
                  }}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p>Aucun bon de commande lié trouvé</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBCDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
