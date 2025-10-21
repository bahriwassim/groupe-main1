'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getOrders, getClients, getProducts } from '@/lib/supabase-service';
import type { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { isSameDay, format } from 'date-fns';

export default function CalendarView() {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | undefined>(undefined);

  // Placeholder - remplacer par des appels Supabase
  const orders: any[] = [];
  const clients: any[] = [];
  const products: any[] = [];
  const orderStatuses = ['Saisi', 'Validé', 'En fabrication', 'Terminé', 'Annulé'];

  const ordersForDay = selectedDay
    ? orders.filter((order: any) => isSameDay(new Date(order.deliveryDate), selectedDay))
    : [];

  const clientsMap = new Map(
    clients.map((c: any) => [c.id, c])
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

  const filteredOrders = selectedStatus
    ? ordersForDay.filter((order: any) => order.status === selectedStatus)
    : ordersForDay;

  const hasOrdersForDate = (date: Date) =>
    orders.some((order: any) => isSameDay(new Date(order.deliveryDate), date));

  const productsMap = new Map(
    products.map((p: any) => [p.id, p])
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

          <Select value={undefined} onValueChange={(value) => {}}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={undefined as any}>Tous les clients</SelectItem>
              {clients.map((client: any) => (
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
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={setSelectedDay}
                className="rounded-md"
                components={{
                  DayContent: ({ date, ...props }) => (
                    <div className="relative">
                      <span {...props}>{format(date, 'd')}</span>
                      {hasOrdersForDate(date) && (
                        <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  )
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                Commandes pour le {selectedDay ? format(selectedDay, 'dd MMMM yyyy') : 'jour sélectionné'}
              </CardTitle>
              <CardDescription>
                {filteredOrders.length} commande(s) trouvée(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Fonctionnalité calendrier temporairement désactivée
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}