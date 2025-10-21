'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';
import {
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Factory,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getOrders, getClients, getProducts } from '@/lib/supabase-service';
import type { Order, Client, Product } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ordersData, clientsData, productsData] = await Promise.all([
          getOrders(),
          getClients(),
          getProducts()
        ]);

        setOrders(ordersData);
        setClients(clientsData);
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement du tableau de bord...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculer les statistiques
  const totalOrders = orders.length;
  const totalClients = clients.length;
  const totalProducts = products.length;

  const todaysOrders = orders.filter(order => isToday(order.deliveryDate));
  const thisWeekOrders = orders.filter(order => isThisWeek(order.deliveryDate));
  const thisMonthOrders = orders.filter(order => isThisMonth(order.deliveryDate));

  const pendingOrders = orders.filter(order => order.status === 'Saisi');
  const validatedOrders = orders.filter(order => order.status === 'Validé');
  const inProgressOrders = orders.filter(order => order.status === 'En fabrication');
  const completedOrders = orders.filter(order => order.status === 'Terminé');

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const monthlyRevenue = thisMonthOrders.reduce((sum, order) => sum + order.total, 0);

  const productionEfficiency = totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 0;

  const stats = [
    {
      title: "Commandes du Jour",
      value: todaysOrders.length,
      description: "Livraisons prévues aujourd'hui",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Commandes en Attente",
      value: pendingOrders.length,
      description: "En attente de validation",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100"
    },
    {
      title: "En Production",
      value: inProgressOrders.length,
      description: "Actuellement en fabrication",
      icon: Factory,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      title: "Terminées",
      value: completedOrders.length,
      description: "Production terminée",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100"
    }
  ];

  const quickActions = [
    {
      title: "Nouvelle Commande",
      description: "Créer un bon de commande",
      href: "/orders/new",
      icon: ShoppingCart,
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "Planification Production",
      description: "Gérer la production",
      href: "/production",
      icon: Factory,
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "Catalogue Produits",
      description: "Gérer les produits",
      href: "/products",
      icon: Package,
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "Calendrier",
      description: "Voir le planning",
      href: "/calendar",
      icon: Calendar,
      color: "bg-orange-500 hover:bg-orange-600"
    }
  ];

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord</h1>
          <p className="text-muted-foreground mt-2">
            Vue d'ensemble de l'activité Essoukri Pâtisserie
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Badge>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 border-l-4" style={{ borderLeftColor: stat.color.replace('text-', '#') }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-3 rounded-xl ${stat.bgColor} shadow-sm`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistiques financières et de performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} TND</div>
            <p className="text-xs text-muted-foreground">
              Total des commandes
            </p>
            <div className="mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">
                {monthlyRevenue.toFixed(2)} TND ce mois
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficacité Production</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productionEfficiency}%</div>
            <p className="text-xs text-muted-foreground">
              Taux de réussite
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${productionEfficiency}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Produits disponibles
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              {clients.length} clients actifs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Actions Rapides
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} href={action.href}>
                <Card className="group hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-primary/50">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`p-4 rounded-2xl ${action.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base group-hover:text-primary transition-colors">{action.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Accéder <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Résumé des commandes récentes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Commandes Récentes</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{todaysOrders.length}</div>
                <p className="text-sm text-muted-foreground">Aujourd'hui</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{thisWeekOrders.length}</div>
                <p className="text-sm text-muted-foreground">Cette semaine</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{thisMonthOrders.length}</div>
                <p className="text-sm text-muted-foreground">Ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
