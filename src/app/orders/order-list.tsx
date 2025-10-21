'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { getOrders, getClients } from '@/lib/supabase-service';
import type { OrderStatus, Order, Client } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Preloader, usePreloader } from '@/components/preloader';

// Map DB codes -> UI labels
const dbToLabel: Record<string, string> = {
  en_attente: 'Saisi',
  valide_admin: 'Validé',
  en_fabrication: 'En fabrication',
  controle_qualite: 'Contrôle qualité',
  pret: 'Prêt',
  livre: 'Livré',
  termine: 'Terminé',
  annule: 'Annulé',
};

// Color map by normalized UI label
const statusColors: Record<string, string> = {
  'Saisi': 'bg-gray-200 text-gray-800 hover:bg-gray-200',
  'Validé': 'bg-blue-200 text-blue-800 hover:bg-blue-200',
  'En fabrication': 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200',
  'Contrôle qualité': 'bg-purple-200 text-purple-800 hover:bg-purple-200',
  'Prêt': 'bg-green-200 text-green-800 hover:bg-green-200',
  'Livré': 'bg-green-200 text-green-800 hover:bg-green-200',
  'Terminé': 'bg-green-200 text-green-800 hover:bg-green-200',
  'Annulé': 'bg-red-200 text-red-800 hover:bg-red-200',
};

const getDisplayLabel = (status: string) => {
  const label = dbToLabel[status] || status;
  return label === 'Validé' ? "Validé par l'admin" : label;
};

const paymentTypeColors = {
  virement: 'bg-purple-200 text-purple-800 hover:bg-purple-200',
  espece: 'bg-green-200 text-green-800 hover:bg-green-200',
  cheque: 'bg-orange-200 text-orange-800 hover:bg-orange-200',
};

const getPaymentTypeLabel = (type?: string) => {
  switch (type) {
    case 'virement': return 'Virement';
    case 'espece': return 'Espèce';
    case 'especes': return 'Espèces';
    case 'cheque': return 'Chèque';
    case 'carte': return 'Carte bancaire';
    default: return 'Espèce'; // Par défaut espèce au lieu de "Non spécifié"
  }
};

export default function OrderList() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [ordersList, setOrdersList] = useState<Order[]>([]);
    const [clientsList, setClientsList] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const { progress, completeLoading } = usePreloader(loading);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Date filters
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [ordersData, clientsData] = await Promise.all([
                    getOrders(),
                    getClients()
                ]);
                setOrdersList(ordersData);
                setClientsList(clientsData);
                completeLoading(); // Compléter la progression à 100%
            } catch (error) {
                console.error('Erreur lors du chargement des données:', error);
            } finally {
                // Petit délai pour une transition fluide
                setTimeout(() => setLoading(false), 200);
            }
        };

        loadData();
    }, [completeLoading]);

    const getClientName = (clientId: string) => {
        return clientsList.find(c => c.id === clientId)?.name || 'N/A';
    };

    const filteredOrders = useMemo(() => {
        return ordersList.filter((order) => {
            const clientName = getClientName(order.clientId);
            const matchesSearch = searchTerm === '' ||
                order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                clientName.toLowerCase().includes(searchTerm.toLowerCase());

            const displayLabel = getDisplayLabel(order.status);
            const matchesStatus = statusFilter === 'all' || displayLabel === statusFilter;

            // Date filtering
            const orderDate = new Date(order.deliveryDate);
            const today = new Date();
            let matchesDate = true;

            switch (dateFilter) {
                case 'today':
                    matchesDate = orderDate.toDateString() === today.toDateString();
                    break;
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    matchesDate = orderDate >= weekAgo && orderDate <= today;
                    break;
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(today.getMonth() - 1);
                    matchesDate = orderDate >= monthAgo && orderDate <= today;
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999); // Include the end date
                        matchesDate = orderDate >= start && orderDate <= end;
                    }
                    break;
                case 'all':
                default:
                    matchesDate = true;
                    break;
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [searchTerm, statusFilter, dateFilter, startDate, endDate, ordersList, clientsList]);

    // Pagination logic
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredOrders, currentPage, itemsPerPage]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, dateFilter, startDate, endDate, itemsPerPage]);

    const clearSearch = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setDateFilter('all');
        setStartDate('');
        setEndDate('');
    };

  return (
    <>
      <Preloader
        isLoading={loading}
        progress={progress}
        message="Chargement des commandes..."
      />
      {!loading && (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par N° BC ou nom client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="absolute right-1 top-1 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Select
          value={statusFilter}
          onValueChange={(value: OrderStatus | 'all') => setStatusFilter(value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="Saisi">Saisi</SelectItem>
            <SelectItem value="Validé par l'admin">Validé par l'admin</SelectItem>
            <SelectItem value="En fabrication">En fabrication</SelectItem>
            <SelectItem value="Contrôle qualité">Contrôle qualité</SelectItem>
            <SelectItem value="Prêt">Prêt</SelectItem>
            <SelectItem value="Livré">Livré</SelectItem>
            <SelectItem value="Terminé">Terminé</SelectItem>
            <SelectItem value="Annulé">Annulé</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={dateFilter}
          onValueChange={(value: 'all' | 'today' | 'week' | 'month' | 'custom') => setDateFilter(value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrer par date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="custom">Période personnalisée</SelectItem>
          </SelectContent>
        </Select>

        {dateFilter === 'custom' && (
          <>
            <Input
              type="date"
              placeholder="Date début"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-[150px]"
            />
            <Input
              type="date"
              placeholder="Date fin"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-[150px]"
            />
          </>
        )}

        {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
          <Button variant="outline" onClick={clearSearch}>
            <X className="mr-2 h-4 w-4" />
            Effacer
          </Button>
        )}
      </div>

      {/* Résultats de recherche */}
      <div className="text-sm text-muted-foreground px-4">
        {filteredOrders.length} bon{filteredOrders.length > 1 ? 's' : ''} de commande{filteredOrders.length > 1 ? 's' : ''} trouvé{filteredOrders.length > 1 ? 's' : ''}
        {searchTerm && ` pour "${searchTerm}"`}
        {statusFilter !== 'all' && ` avec le statut "${statusFilter}"`}
        {dateFilter !== 'all' && (
          dateFilter === 'today' ? ' pour aujourd\'hui' :
          dateFilter === 'week' ? ' pour cette semaine' :
          dateFilter === 'month' ? ' pour ce mois' :
          dateFilter === 'custom' && startDate && endDate ? ` du ${format(new Date(startDate), 'dd/MM/yyyy')} au ${format(new Date(endDate), 'dd/MM/yyyy')}` : ''
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° BC</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date et Heure Livraison</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Type Paiement</TableHead>
            <TableHead>Facture</TableHead>
            <TableHead className="text-right">Total (TND)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedOrders.map((order) => (
            <TableRow key={order.id} className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
              <TableCell className="font-medium">{order.orderNumber}</TableCell>
              <TableCell>{getClientName(order.clientId)}</TableCell>
              <TableCell>
                {format(order.deliveryDate, 'dd/MM/yyyy')}
                {order.deliveryTime && (
                  <div className="text-sm text-muted-foreground">
                    à {order.deliveryTime}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("border-transparent", statusColors[getDisplayLabel(order.status)] || 'bg-gray-100 text-gray-600') }>
                  {getDisplayLabel(order.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn("border-transparent text-xs",
                    order.paymentType ? paymentTypeColors[order.paymentType as keyof typeof paymentTypeColors] : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {getPaymentTypeLabel(order.paymentType)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn("border-transparent text-xs",
                    order.needsInvoice
                      ? 'bg-blue-200 text-blue-800 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {order.needsInvoice ? 'Avec facture' : 'Sans facture'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{order.total.toFixed(2)} TND</TableCell>
            </TableRow>
          ))}
          {paginatedOrders.length === 0 && filteredOrders.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? "Aucun bon de commande ne correspond à vos critères de recherche." 
                  : "Aucun bon de commande trouvé."
                }
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">
              Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredOrders.length)} sur {filteredOrders.length} commandes
            </p>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Lignes par page</p>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
      )}
    </>
  );
}
