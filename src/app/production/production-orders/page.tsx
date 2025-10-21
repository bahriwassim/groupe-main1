'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Filter,
  Plus,
  Factory,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Users,
  List,
  Grid3X3
} from 'lucide-react';
import Link from 'next/link';
import { ProductionOrderCard } from '@/components/production-order-card';
import { ProductionOrderListItem } from '@/components/production-order-list-item';
import {
  getProductionOrders,
  getProductionStatistics,
  type ProductionOrder
} from '@/lib/supabase-service';
import { supabase } from '@/lib/supabase';
import { Preloader, usePreloader } from '@/components/preloader';

export default function ProductionOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [laboratoryFilter, setLaboratoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { progress, completeLoading } = usePreloader(loading);

  const loadData = async () => {
    try {
      const orders = await getProductionOrders();
      setProductionOrders(orders);
      completeLoading();
    } catch (error) {
      console.error('Erreur lors du chargement des ordres de production:', error);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime refresh on INSERT/UPDATE
    const channel = supabase
      .channel('production_orders_page_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'production_orders' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'production_orders' }, () => {
        loadData();
      })
      .subscribe();

    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [completeLoading]);

  const statistics = getProductionStatistics(productionOrders);

  // Filtrage des ordres
  const filteredOrders = useMemo(() => {
    return productionOrders.filter((order) => {
      const matchesSearch = searchTerm === '' || 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(order.bcOrigins) && order.bcOrigins.some(o => o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        order.laboratory.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === (statusFilter as any);
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter as any;
      const matchesLaboratory = laboratoryFilter === 'all' || order.laboratory === laboratoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesLaboratory;
    });
  }, [searchTerm, statusFilter, priorityFilter, laboratoryFilter, productionOrders]);

  // Grouper par statut pour les onglets
  const ordersByStatus = useMemo(() => {
    const groups = {
      cree: filteredOrders.filter(o => o.status === 'cree'),
      validation_production: filteredOrders.filter(o => o.status === 'validation_production'),
      production_validee: filteredOrders.filter(o => o.status === 'production_validee'),
      en_fabrication: filteredOrders.filter(o => o.status === 'en_fabrication'),
      production_terminee: filteredOrders.filter(o => o.status === 'production_terminee'),
      validation_qualite: filteredOrders.filter(o => o.status === 'validation_qualite'),
      termine: filteredOrders.filter(o => o.status === 'termine'),
    } as const;
    return groups;
  }, [filteredOrders]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setLaboratoryFilter('all');
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      cree: 'À Commencer',
      validation_production: 'Validation Production',
      production_validee: 'Production Validée',
      en_fabrication: 'En Fabrication',
      production_terminee: 'Production Terminée',
      validation_qualite: 'Validation Qualité',
      termine: 'Terminé'
    };
    return (labels as any)[status] || status;
  };

  const getStatusCount = (status: string) => {
    return ordersByStatus[status as keyof typeof ordersByStatus]?.length || 0;
  };

  return (
    <>
      <Preloader
        isLoading={loading}
        progress={progress}
        message="Chargement des ordres de fabrication..."
      />
      {!loading && (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* En-tête amélioré */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Ordres de Fabrication
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Gestion et suivi des ordres de fabrication par laboratoire
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Bouton de basculement d'affichage amélioré */}
          <div className="flex items-center border-2 rounded-lg shadow-sm bg-background">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Cartes
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4 mr-1" />
              Liste
            </Button>
          </div>

          <Link href="/production/production-orders/new">
            <Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
              <Plus className="mr-2 h-5 w-5" />
              Nouvel Ordre
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistiques améliorées */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-lg transition-all border-l-4 border-l-gray-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <div className="p-2 bg-gray-100 rounded-lg">
              <Factory className="h-5 w-5 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-700">{statistics.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ordres de fabrication
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-700">
              {statistics.byStatus.pendingQuality}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Validations en cours
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Production</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{statistics.byStatus.inProduction}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Actuellement en cours
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminés</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{statistics.byStatus.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Production terminée
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgents</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{statistics.byPriority.urgent}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Priorité urgente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres améliorés */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° OF, BC ou laboratoire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
                          </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="cree">À Commencer</SelectItem>
              <SelectItem value="validation_production">Validation Production</SelectItem>
              <SelectItem value="production_validee">Production Validée</SelectItem>
              <SelectItem value="en_fabrication">En Fabrication</SelectItem>
              <SelectItem value="production_terminee">Production Terminée</SelectItem>
              <SelectItem value="validation_qualite">Validation Qualité</SelectItem>
              <SelectItem value="termine">Terminé</SelectItem>
            </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les priorités</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="normal">Normale</SelectItem>
                <SelectItem value="low">Basse</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={laboratoryFilter} onValueChange={setLaboratoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Laboratoire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les laboratoires</SelectItem>
                <SelectItem value="Labo traditionnel">Labo traditionnel</SelectItem>
                <SelectItem value="Laboratoire biscuit">Laboratoire biscuit</SelectItem>
                <SelectItem value="Viennoiserie">Viennoiserie</SelectItem>
                <SelectItem value="Laboratoire cheese">Laboratoire cheese</SelectItem>
                <SelectItem value="Laboratoire gâteaux français">Laboratoire gâteaux français</SelectItem>
              </SelectContent>
            </Select>
                        </div>
          
          {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || laboratoryFilter !== 'all') && (
            <div className="mt-6 p-4 bg-primary/5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {filteredOrders.length}
                </Badge>
                <p className="text-sm font-medium">
                  ordre(s) trouvé(s)
                  {searchTerm && ` pour "${searchTerm}"`}
                </p>
              </div>
              <Button variant="outline" onClick={clearFilters} size="sm" className="shadow-sm">
                Effacer les filtres
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onglets par statut - Version compacte */}
      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <TabsList className="inline-flex h-auto gap-1 bg-transparent p-0">
            <TabsTrigger
              value="all"
              className="flex items-center gap-1.5 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Tous
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs">
                {filteredOrders.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="cree"
              className="flex items-center gap-1.5 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              À Commencer
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs">
                {getStatusCount('cree')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="validation_production"
              className="flex items-center gap-1.5 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Valid. Prod.
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs">
                {getStatusCount('validation_production')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="production_validee"
              className="flex items-center gap-1.5 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Prod. Validée
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs">
                {getStatusCount('production_validee')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="en_fabrication"
              className="flex items-center gap-1.5 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              En Fabrication
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs">
                {getStatusCount('en_fabrication')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="production_terminee"
              className="flex items-center gap-1.5 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Prod. Terminée
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs">
                {getStatusCount('production_terminee')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="validation_qualite"
              className="flex items-center gap-1.5 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Valid. Qualité
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs">
                {getStatusCount('validation_qualite')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="termine"
              className="flex items-center gap-1.5 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Terminé
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs">
                {getStatusCount('termine')}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-4">
          {viewMode === 'cards' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.map((order) => (
                <ProductionOrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map((order) => (
                <ProductionOrderListItem key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>

        {Object.entries(ordersByStatus).map(([status, orders]) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {viewMode === 'cards' ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {orders.map((order) => (
                  <ProductionOrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <ProductionOrderListItem key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Message si aucun résultat - Amélioré */}
      {filteredOrders.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-6 bg-primary/10 rounded-full mb-6">
              <Factory className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Aucun ordre trouvé</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || laboratoryFilter !== 'all'
                ? "Aucun ordre de fabrication ne correspond à vos critères de recherche."
                : "Vous n'avez pas encore créé d'ordre de fabrication. Commencez par créer votre premier ordre."
              }
            </p>
            {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || laboratoryFilter !== 'all') ? (
              <Button variant="outline" onClick={clearFilters} size="lg">
                Effacer les filtres
              </Button>
            ) : (
              <Link href="/production/production-orders/new">
                <Button size="lg" className="shadow-lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Créer un Ordre de Fabrication
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
      )}
    </>
  );
}