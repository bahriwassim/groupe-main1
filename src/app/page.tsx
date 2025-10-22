'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';
import {
  ShoppingCart,
  Package,
  Calendar,
  Clock,
  CheckCircle,
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
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    // Set current date on client only to avoid hydration mismatch
    setCurrentDate(new Date());

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

  const productionEfficiency = totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 0;

  const stats = [
    {
      title: "Commandes du Jour",
      value: todaysOrders.length,
      description: "Livraisons prévues aujourd'hui",
      icon: Calendar,
      color: "text-sky-600",
      bgColor: "bg-gradient-to-br from-sky-50 to-sky-100",
      borderColor: "border-sky-200"
    },
    {
      title: "Commandes en Attente",
      value: pendingOrders.length,
      description: "En attente de validation",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-gradient-to-br from-amber-50 to-amber-100",
      borderColor: "border-amber-200"
    },
    {
      title: "En Production",
      value: inProgressOrders.length,
      description: "Actuellement en fabrication",
      icon: Factory,
      color: "text-violet-600",
      bgColor: "bg-gradient-to-br from-violet-50 to-violet-100",
      borderColor: "border-violet-200"
    },
    {
      title: "Terminées",
      value: completedOrders.length,
      description: "Production terminée",
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      borderColor: "border-emerald-200"
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
    <div className="flex-1 space-y-4 md:space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tableau de Bord</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Vue d'ensemble de l'activité Essoukri Pâtisserie
          </p>
        </div>
        {currentDate && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs md:text-sm">
              <span className="hidden md:inline">
                {currentDate.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <span className="md:hidden">
                {currentDate.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </Badge>
          </div>
        )}
      </div>

      {/* Statistiques principales */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className={`hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 ${stat.borderColor} overflow-hidden`}>
              <div className={`h-1 md:h-1.5 ${stat.bgColor}`}></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-semibold leading-tight">{stat.title}</CardTitle>
                <div className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl ${stat.bgColor} shadow-md`}>
                  <Icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className={`text-2xl md:text-4xl font-bold ${stat.color} tracking-tight`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 md:mt-2 line-clamp-2">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistiques de performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-indigo-200 hover:shadow-lg transition-all duration-300">
          <div className="h-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Efficacité Production</CardTitle>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-md">
              <Factory className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{productionEfficiency}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              Taux de réussite
            </p>
            <div className="mt-3 w-full bg-indigo-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${productionEfficiency}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-rose-200 hover:shadow-lg transition-all duration-300">
          <div className="h-1.5 bg-gradient-to-r from-rose-50 to-rose-100"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Portfolio</CardTitle>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 shadow-md">
              <Package className="h-5 w-5 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Produits disponibles
            </p>
            <div className="mt-3 text-sm text-muted-foreground">
              <ShoppingCart className="inline h-4 w-4 mr-1" />
              {clients.length} clients actifs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Actions Rapides
          </h2>
        </div>
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} href={action.href}>
                <Card className="group hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-primary/50">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
                      <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${action.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-5 w-5 md:h-7 md:w-7" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm md:text-base group-hover:text-primary transition-colors line-clamp-2">{action.title}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden md:block">{action.description}</p>
                        <div className="mt-1 md:mt-2 flex items-center justify-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
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
      <div className="space-y-3 md:space-y-4">
        <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          Aperçu des Commandes
        </h2>
        <Card className="border-2 border-slate-200">
          <CardContent className="p-4 md:p-6">
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="text-center p-3 md:p-4 rounded-lg bg-gradient-to-br from-sky-50 to-sky-100 border-2 border-sky-200">
                <div className="text-2xl md:text-3xl font-bold text-sky-600">{todaysOrders.length}</div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">Aujourd'hui</p>
              </div>
              <div className="text-center p-3 md:p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200">
                <div className="text-2xl md:text-3xl font-bold text-emerald-600">{thisWeekOrders.length}</div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">Cette semaine</p>
              </div>
              <div className="text-center p-3 md:p-4 rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 border-2 border-violet-200">
                <div className="text-2xl md:text-3xl font-bold text-violet-600">{thisMonthOrders.length}</div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">Ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
