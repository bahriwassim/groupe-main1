'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getOrders, getClients, getProducts } from '@/lib/supabase-service';
import type { OrderStatus, Order, Client, Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { isSameDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CalendarView() {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | undefined>(undefined);
  const [selectedClient, setSelectedClient] = useState<string | undefined>(undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const orderStatuses = ['Saisi', 'Validé', 'En fabrication', 'Terminé', 'Annulé'];

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
        console.error('Erreur chargement données calendrier:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const ordersForDay = selectedDay
    ? orders.filter(order => isSameDay(new Date(order.deliveryDate), selectedDay))
    : [];

  const clientsMap = new Map(
    clients.map(c => [c.id, c])
  );

  const statusColors: Record<OrderStatus, string> = {
    Saisi: 'bg-gray-200 text-gray-800 hover:bg-gray-200',
    Validé: 'bg-blue-200 text-blue-800 hover:bg-blue-200',
    'En fabrication': 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200',
    Terminé: 'bg-green-200 text-green-800 hover:bg-green-200',
    Annulé: 'bg-red-200 text-red-800 hover:bg-red-200',
    valide_admin: 'bg-blue-300 text-blue-900 hover:bg-blue-300',
    en_fabrication: 'bg-yellow-300 text-yellow-900 hover:bg-yellow-300',
    en_attente: 'bg-orange-200 text-orange-800 hover:bg-orange-200',
    livre: 'bg-green-300 text-green-900 hover:bg-green-300',
    pret: 'bg-teal-200 text-teal-800 hover:bg-teal-200',
    controle_qualite: 'bg-purple-200 text-purple-800 hover:bg-purple-200',
    annule: 'bg-red-300 text-red-900 hover:bg-red-300',
  };

  let filteredOrders = ordersForDay;

  if (selectedStatus) {
    filteredOrders = filteredOrders.filter(order => order.status === selectedStatus);
  }

  if (selectedClient) {
    filteredOrders = filteredOrders.filter(order => order.clientId === selectedClient);
  }

  const hasOrdersForDate = (date: Date) =>
    orders.some(order => isSameDay(new Date(order.deliveryDate), date));

  const productsMap = new Map(
    products.map(p => [p.id, p])
  );

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendrier</h2>
          <p className="text-muted-foreground">
            Voir et gérer les commandes par date
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as OrderStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={undefined as any}>Tous les statuts</SelectItem>
              {orderStatuses.map((status: string) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Calendrier</CardTitle>
              <CardDescription>
                Sélectionnez une date pour voir les commandes
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {!loading && (
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={setSelectedDay}
                  locale={fr}
                  className="rounded-md border"
                  modifiers={{
                    hasOrders: (date) => hasOrdersForDate(date)
                  }}
                  modifiersClassNames={{
                    hasOrders: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:bg-blue-500 after:rounded-full'
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                Commandes pour le {selectedDay ? format(selectedDay, 'dd MMMM yyyy', { locale: fr }) : 'jour sélectionné'}
              </CardTitle>
              <CardDescription>
                {filteredOrders.length} commande(s) trouvée(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  Chargement...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune commande pour cette date
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map(order => {
                    const client = clientsMap.get(order.clientId);
                    return (
                      <Card key={order.id} className="border-l-4" style={{ borderLeftColor: statusColors[order.status]?.replace('bg-', '#') || '#ccc' }}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{order.orderNumber}</CardTitle>
                            <Badge className={statusColors[order.status]}>
                              {order.status}
                            </Badge>
                          </div>
                          <CardDescription>
                            Client: {client?.name || 'Inconnu'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <div className="grid gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Heure de livraison:</span>
                              <span className="font-medium">{order.deliveryTime || 'Non spécifiée'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total:</span>
                              <span className="font-medium">{order.total.toFixed(2)} TND</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Articles:</span>
                              <span className="font-medium">{order.items.length} produit(s)</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}