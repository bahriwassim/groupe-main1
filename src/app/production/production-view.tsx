'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getOrders, getClients, getProducts } from '@/lib/supabase-service';
import type { Order, Client, Product } from '@/lib/types';
import { isToday } from 'date-fns';
import { Sheet, Calendar, Clock, CheckCircle, AlertCircle, ChefHat, Package, Filter, Grid3X3, List } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Preloader, usePreloader } from '@/components/preloader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ConsolidatedItem {
    name: string;
    quantity: number;
    imageUrl: string;
    productId: string;
}

// Laboratoires disponibles
const LABORATORIES = [
  'Tous les laboratoires',
  'Laboratoire salés',
  'Labo traditionnel',
  'Laboratoire biscuit',
  'Viennoiserie',
  'Laboratoire cheese',
  'Laboratoire gâteaux français',
  'Laboratoire cake',
  'Laboratoire tarte',
  'Laboratoire gâteaux tunisiens',
] as const;

export default function ProductionView() {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedLaboratory, setSelectedLaboratory] = useState<string>('Tous les laboratoires');
  const [viewMode, setViewMode] = useState<'summary' | 'table'>('summary');
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { progress, completeLoading } = usePreloader(loading);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersData, clientsData, productsData] = await Promise.all([
          getOrders(),
          getClients(),
          getProducts()
        ]);

        setOrders(ordersData);
        setClients(clientsData);
        setProducts(productsData);
        completeLoading();
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setTimeout(() => setLoading(false), 200);
      }
    };

    loadData();
  }, [completeLoading]);

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || 'Inconnu';
  const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || 'Inconnu';
  const getProductImage = (productId: string) => products.find(p => p.id === productId)?.imageUrl || '/placeholder-product.jpg';

  const todaysOrders = useMemo(() => {
    return orders.filter(order => isToday(order.deliveryDate) && order.status !== 'Saisi' && order.status !== 'Annulé');
  }, [orders]);

  const productionStats = useMemo(() => {
    const totalOrders = orders.filter(order => order.status === 'En fabrication' || order.status === 'Terminé');
    const completedOrders = orders.filter(order => order.status === 'Terminé');
    const inProgressOrders = orders.filter(order => order.status === 'En fabrication');

    return {
      total: totalOrders.length,
      completed: completedOrders.length,
      inProgress: inProgressOrders.length,
      efficiency: totalOrders.length > 0 ? Math.round((completedOrders.length / totalOrders.length) * 100) : 0
    };
  }, [orders]);

  // Mapping des catégories vers les laboratoires
  const labMapping: Record<string, string> = {
    'Salé': 'Laboratoire salés',
    'Traditionnel': 'Labo traditionnel',
    'Biscuit': 'Laboratoire biscuit',
    'Pain/Viennoiserie': 'Viennoiserie',
    'Pâtisserie Fine': 'Laboratoire cheese',
    'Gâteaux Français': 'Laboratoire gâteaux français',
    'Cakes': 'Laboratoire cake',
    'Tartes': 'Laboratoire tarte',
    'Gâteaux Tunisiens': 'Laboratoire gâteaux tunisiens',
  };

  const consolidatedItems = useMemo((): ConsolidatedItem[] => {
    if (selectedOrders.length === 0) return [];

    const itemMap = new Map<string, { quantity: number; imageUrl: string; productId: string }>();
    const selected = orders.filter(o => selectedOrders.includes(o.id));

    for (const order of selected) {
        for (const item of order.items) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                // Filtrer par laboratoire si un est sélectionné
                const productLab = labMapping[product.category];
                if (selectedLaboratory === 'Tous les laboratoires' || productLab === selectedLaboratory) {
                  const existing = itemMap.get(product.name);
                  if (existing) {
                      existing.quantity += item.quantity;
                  } else {
                      itemMap.set(product.name, {
                          quantity: item.quantity,
                          imageUrl: product.imageUrl,
                          productId: product.id
                      });
                  }
                }
            }
        }
    }

    return Array.from(itemMap.entries()).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        imageUrl: data.imageUrl,
        productId: data.productId
    })).sort((a,b) => a.name.localeCompare(b.name));
  }, [selectedOrders, orders, products, selectedLaboratory]);

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(todaysOrders.map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleToggleOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const statusConfig = {
      'Validé': { color: 'bg-blue-100 text-blue-800', icon: Clock },
      'En fabrication': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'Terminé': { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };
  
  return (
    <>
      <Preloader
        isLoading={loading}
        progress={progress}
        message="Chargement de la planification production..."
      />
      {!loading && (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        {/* Statistiques de production */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commandes du Jour</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaysOrders.length}</div>
              <p className="text-xs text-muted-foreground">
                À traiter aujourd'hui
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Fabrication</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productionStats.inProgress}</div>
              <p className="text-xs text-muted-foreground">
                En cours de production
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Commandes du jour */}
        <Card>
          <CardHeader>
            <CardTitle>Commandes du Jour</CardTitle>
            <CardDescription>Sélectionnez les commandes à inclure dans l'ordre de fabrication.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 border-b pb-4">
              <Checkbox
                id="select-all"
                onCheckedChange={(checked) => handleToggleAll(Boolean(checked))}
                checked={selectedOrders.length === todaysOrders.length && todaysOrders.length > 0}
                disabled={todaysOrders.length === 0}
              />
              <Label htmlFor="select-all" className="text-sm font-medium">
                Tout sélectionner
              </Label>
            </div>
            <div className="max-h-[350px] overflow-y-auto pr-2 space-y-2">
                {todaysOrders.length > 0 ? (
                    todaysOrders.map(order => (
                    <div key={order.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={order.id}
                        onCheckedChange={(checked) => handleToggleOrder(order.id, Boolean(checked))}
                        checked={selectedOrders.includes(order.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">{order.orderNumber}</span>
                          {getOrderStatusBadge(order.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">{getClientName(order.clientId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.items.length} produit(s) • Total: {order.total.toFixed(2)} TND
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Aucune commande à produire aujourd'hui.</p>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ordre de fabrication consolidé */}
      <div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ordre de Fabrication consolidé</CardTitle>
                <CardDescription>
                  {selectedOrders.length > 0
                    ? `${selectedOrders.length} commande(s) sélectionnée(s) • ${consolidatedItems.length} produit(s) à produire`
                    : 'Liste de tous les articles à produire pour les commandes sélectionnées.'
                  }
                </CardDescription>
              </div>
              {selectedOrders.length > 0 && (
                <div className="flex items-center gap-2">
                  {/* Bouton de basculement de vue */}
                  <div className="flex items-center border-2 rounded-lg shadow-sm bg-background">
                    <Button
                      variant={viewMode === 'summary' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('summary')}
                      className="rounded-r-none"
                    >
                      <Grid3X3 className="h-4 w-4 mr-1" />
                      Résumé
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4 mr-1" />
                      Tableau
                    </Button>
                  </div>

                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedLaboratory} onValueChange={setSelectedLaboratory}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Filtrer par laboratoire" />
                    </SelectTrigger>
                    <SelectContent>
                      {LABORATORIES.map((lab) => (
                        <SelectItem key={lab} value={lab}>
                          {lab}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {selectedOrders.length > 0 ? (
              <div className="space-y-4">
                {/* Vue Résumé - Affichage par défaut */}
                {viewMode === 'summary' && (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-amber-50">
                          <TableRow>
                            <TableHead className="w-20">Image</TableHead>
                            <TableHead>Produit</TableHead>
                            <TableHead className="text-center w-32">
                              <div className="flex items-center justify-center gap-2">
                                <Package className="h-4 w-4" />
                                Quantité
                              </div>
                            </TableHead>
                            <TableHead className="text-center w-24">Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {consolidatedItems.map((item, index) => (
                            <TableRow
                              key={item.productId}
                              className="hover:bg-amber-50/50 transition-colors"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <TableCell>
                                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-amber-200">
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Réf: {item.productId}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-lg">
                                  {item.quantity}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  <Clock className="w-3 h-3 mr-1" />
                                  En attente
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {/* Vue Tableau - Détails complets par commande */}
                {viewMode === 'table' && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-amber-50">
                        <TableRow>
                          <TableHead>N° Commande</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Image</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead className="text-center">Quantité</TableHead>
                          <TableHead className="text-center">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrders.map(orderId => {
                          const order = orders.find(o => o.id === orderId);
                          if (!order) return null;

                          return order.items.map((item, index) => {
                            const product = products.find(p => p.id === item.productId);
                            if (!product) return null;

                            // Appliquer le filtre laboratoire
                            const productLab = labMapping[product.category];
                            if (selectedLaboratory !== 'Tous les laboratoires' && productLab !== selectedLaboratory) {
                              return null;
                            }

                            const client = clients.find(c => c.id === order.clientId);

                            return (
                              <TableRow key={`${orderId}-${index}`} className="hover:bg-amber-50/50 transition-colors">
                                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                <TableCell>{client?.name || 'N/A'}</TableCell>
                                <TableCell>
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-amber-200">
                                    <Image
                                      src={product.imageUrl}
                                      alt={product.name}
                                      fill
                                      className="object-cover"
                                      sizes="48px"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {product.category}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary" className="font-bold">
                                    {item.quantity} {product.unit}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                    <Clock className="w-3 h-3 mr-1" />
                                    En attente
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Résumé de production - Affiché dans les deux modes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-lg">
                          <ChefHat className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Types de produits</p>
                          <p className="text-2xl font-bold text-amber-900">
                            {consolidatedItems.length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-lg">
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Quantité totale</p>
                          <p className="text-2xl font-bold text-amber-900">
                            {consolidatedItems.reduce((sum, item) => sum + item.quantity, 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-lg">
                          <Sheet className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Commandes</p>
                          <p className="text-2xl font-bold text-amber-900">
                            {selectedOrders.length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                    <ChefHat className="h-16 w-16 mb-4 text-amber-500" />
                    <p className="text-lg font-medium">Planning de Production</p>
                    <p className="text-sm">Sélectionnez des commandes pour générer le planning</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
      )}
    </>
  );
}
