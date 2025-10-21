

'use client'

import { useState, useRef, useEffect } from 'react';
import { getOrders, getClients, getProducts, updateOrderStatus, updateOrderPayment, addOrderItem, updateOrderItem, deleteOrderItem, createProductionOrder, testStatusTables } from '@/lib/supabase-service';
import { QualityDetailsDropdown } from '@/components/quality-details-dropdown';
import type { OrderStatus, Product, Order, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { notFound, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Settings, Factory, CheckCircle, Plus, Trash2, Edit, Download, DollarSign, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import { useReactToPrint } from 'react-to-print';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import ProductImage from '@/components/product-image';
import { OrderProductionStatus } from '@/components/order-production-status';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const statusColors: Record<string, string> = {
  en_attente: 'bg-gray-200 text-gray-800 hover:bg-gray-200',
  valide_admin: 'bg-blue-200 text-blue-800 hover:bg-blue-200',
  en_fabrication: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200',
  pret: 'bg-green-200 text-green-800 hover:bg-green-200',
  livre: 'bg-green-200 text-green-800 hover:bg-green-200',
  annule: 'bg-red-200 text-red-800 hover:bg-red-200',
  controle_qualite: 'bg-purple-200 text-purple-800 hover:bg-purple-200'
};

const dbToLabel: Record<string, string> = {
  en_attente: 'Saisi',
  valide_admin: 'Validé',
  en_fabrication: 'En fabrication',
  controle_qualite: 'Contrôle qualité',
  pret: 'Prêt',
  livre: 'Livré',
  annule: 'Annulé'
};


const Invoice = ({ order, client, getProduct }: { order: any, client: any, getProduct: (id: string) => any }) => {
    const { role } = useRole();
    const totalTTC = order.total + order.discount;
    const totalHT = totalTTC / 1.07;
    const tva = totalTTC - totalHT;

    return (
        <div className="bg-white text-black p-8">
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="flex flex-col">
                    <Logo variant="default" className="mb-4" />
                    <p className="text-lg font-semibold text-primary">Artisans Pâtissiers depuis 1955</p>
                    <p>Tunis, Tunisie</p>
                    <p>Tél: +216 XX XXX XXX</p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold mb-2">FACTURE</h2>
                    <p>Facture N°: F-{order.orderNumber}</p>
                    <p>Date: {format(new Date(), 'dd/MM/yyyy')}</p>
                </div>
            </div>

            <div className="mb-8">
                <Card className="border-primary">
                    <CardHeader>
                        <CardTitle>Client</CardTitle>
                    </CardHeader>
                     {client && (
                        <CardContent className="text-sm space-y-1">
                            <p className="font-semibold text-base">{client.name}</p>
                            <p>Adresse: {client.address}</p>
                            <p>Contact: {client.contact}</p>
                            {client.taxId && <p>Matricule Fiscal: {client.taxId}</p>}
                        </CardContent>
                    )}
                </Card>
            </div>

            <Table>
                <TableHeader className="bg-primary text-primary-foreground">
                    <TableRow>
                        <TableHead className="text-white">Produit</TableHead>
                        <TableHead className="text-white text-right">Quantité</TableHead>
                        {role !== 'Quality' && (
                          <TableHead className="text-white text-right">Prix Unitaire (TTC)</TableHead>
                        )}
                        {role !== 'Quality' && (
                          <TableHead className="text-white text-right">Total (TTC)</TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.items.map((item: any) => {
                        const product = getProduct(item.productId);
                        return (
                            <TableRow key={item.id}>
                                <TableCell>{product.name}</TableCell>
                                <TableCell className="text-right">{item.quantity} {product.unit}</TableCell>
                                {role !== 'Quality' && (
                                  <TableCell className="text-right">{item.unitPrice.toFixed(2)} TND</TableCell>
                                )}
                                {role !== 'Quality' && (
                                  <TableCell className="text-right font-medium">{item.total.toFixed(2)} TND</TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {role !== 'Quality' && (
            <div className="flex justify-end mt-8">
                <div className="w-1/2 space-y-2 text-right">
                    <div className="flex justify-between"><span>Total HT</span><span>{totalHT.toFixed(2)} TND</span></div>
                    <div className="flex justify-between"><span>TVA (7%)</span><span>{tva.toFixed(2)} TND</span></div>
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-2 border-primary">
                        <span>Total TTC (Avant Remise)</span>
                        <span>{totalTTC.toFixed(2)} TND</span>
                    </div>
                     <div className="flex justify-between text-sm text-destructive"><span>Remise</span><span>- {order.discount.toFixed(2)} TND</span></div>
                     <div className="flex justify-between font-bold text-xl border-t pt-2 border-primary">
                        <span>Total Net à Payer</span>
                        <span>{order.total.toFixed(2)} TND</span>
                    </div>
                    <div className="flex justify-between text-sm"><span>Avance</span><span>- {order.advance.toFixed(2)} TND</span></div>
                    {order.secondAdvance > 0 && <div className="flex justify-between text-sm"><span>2ème Avance</span><span>- {order.secondAdvance.toFixed(2)} TND</span></div>}
                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-primary">
                        <span>Reste à Payer</span>
                        <span>{order.remaining.toFixed(2)} TND</span>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};


export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const router = useRouter();
  const componentRef = useRef(null);
  const { role } = useRole();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersData, clientsData, productsData] = await Promise.all([
          getOrders(),
          getClients(),
          getProducts()
        ]);

        const foundOrder = ordersData.find(o => o.id === orderId);
        setOrder(foundOrder || null);
        setClients(clientsData);
        setProducts(productsData);

        // Retiré: diagnostic automatique pour éviter les erreurs d'insertion de test
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderId]);

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isProductionOrdersDialogOpen, setIsProductionOrdersDialogOpen] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>(order?.status || 'en_attente');
  const [statusNote, setStatusNote] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [newAdvance, setNewAdvance] = useState(0);
  const [newSecondAdvance, setNewSecondAdvance] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProductId, setNewProductId] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newDescription, setNewDescription] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const handleStatusChange = async () => {
    if (order) {
      const success = await updateOrderStatus(order.id, newStatus, statusNote.trim() || undefined);

      if (success) {
        // Mettre à jour l'état local
        order.status = newStatus as any;
        order.statusHistory.push({
          status: newStatus as any,
          timestamp: new Date(),
          note: statusNote.trim() || undefined
        });

        toast({
          title: 'Statut mis à jour',
          description: `Le statut de la commande ${order.orderNumber} a été changé en "${dbToLabel[newStatus] || newStatus}"`,
        });
      } else {
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour le statut de la commande',
          variant: 'destructive'
        });
      }

      setIsStatusDialogOpen(false);
      setStatusNote('');
    }
  };

  const handleGenerateProductionOrders = async () => {
    if (order) {
      try {
        const laboratories = getOrderLaboratories(order);
        const createdOrders = [];

        // Créer un ordre de production pour chaque laboratoire
        for (const lab of laboratories) {
          // Filtrer les items pour ce laboratoire
          const labItems = order.items.filter(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return false;

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

            return labMapping[product.category] === lab;
          });

          if (labItems.length > 0) {
            const productionOrder = await createProductionOrder({
              orderIds: [order.id], // Maintenant on passe un tableau
              laboratory: lab,
              title: `${lab} - ${order.orderNumber}`,
              items: labItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unit: products.find(p => p.id === item.productId)?.unit || 'pièce',
                notes: item.description
              })),
              targetDate: order.deliveryDate,
              priority: 'normal'
            });

            if (productionOrder) {
              createdOrders.push(productionOrder);
            }
          }
        }

        if (createdOrders.length > 0) {
          toast({
            title: "Ordres de fabrication générés",
            description: `${createdOrders.length} ordre(s) de fabrication créé(s) pour les laboratoires`,
          });
        } else {
          toast({
            title: "Erreur",
            description: "Impossible de créer les ordres de fabrication",
            variant: "destructive"
          });
        }

        setIsProductionOrdersDialogOpen(false);
      } catch (error) {
        console.error('Erreur lors de la génération des ordres de fabrication:', error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la génération des ordres de fabrication",
          variant: "destructive"
        });
      }
    }
  };

  const handleAddProduct = async () => {
    if (order && newProductId && newQuantity > 0) {
      const product = products.find(p => p.id === newProductId);
      if (product) {
        const newItem = {
          productId: newProductId,
          quantity: newQuantity,
          unitPrice: product.price,
          total: product.price * newQuantity,
          description: newDescription
        };

        const success = await addOrderItem(order.id, newItem);

        if (success) {
          // Mettre à jour l'état local
          const localItem = {
            id: `item-${Date.now()}`,
            ...newItem
          };

          order.items.push(localItem);
          order.total += newItem.total;
          order.remaining = order.total - order.advance - order.secondAdvance;

          toast({
            title: "Produit ajouté",
            description: `${product.name} a été ajouté à la commande`,
          });

          setIsAddProductDialogOpen(false);
          setNewProductId('');
          setNewQuantity(1);
          setNewDescription('');
        } else {
          toast({
            title: "Erreur",
            description: "Impossible d'ajouter le produit à la commande",
            variant: "destructive"
          });
        }
      }
    }
  };

  const handleEditProduct = async () => {
    if (order && editingItem && newQuantity > 0) {
      const product = products.find(p => p.id === editingItem.productId);
      if (product) {
        const success = await updateOrderItem(editingItem.id, order.id, newQuantity, newDescription);

        if (success) {
          const oldTotal = editingItem.total;
          editingItem.quantity = newQuantity;
          editingItem.total = product.price * newQuantity;
          editingItem.description = newDescription;

          order.total = order.total - oldTotal + editingItem.total;
          order.remaining = order.total - order.advance - order.secondAdvance;

          toast({
            title: "Produit modifié",
            description: `${product.name} a été modifié dans la commande`,
          });

          setIsEditProductDialogOpen(false);
          setEditingItem(null);
          setNewQuantity(1);
          setNewDescription('');
        } else {
          toast({
            title: "Erreur",
            description: "Impossible de modifier le produit",
            variant: "destructive"
          });
        }
      }
    }
  };

  const handlePaymentUpdate = async () => {
    if (order) {
      const success = await updateOrderPayment(order.id, newAdvance, newSecondAdvance);

      if (success) {
        order.advance = newAdvance;
        order.secondAdvance = newSecondAdvance;
        order.remaining = order.total - order.advance - order.secondAdvance;

        toast({
          title: "Paiement mis à jour",
          description: `Les avances ont été modifiées pour la commande ${order.orderNumber}`,
        });

        setIsPaymentDialogOpen(false);
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour les paiements",
          variant: "destructive"
        });
      }
    }
  };

  const handleDeleteProduct = async (itemId: string) => {
    if (order) {
      const success = await deleteOrderItem(itemId, order.id);

      if (success) {
        const itemIndex = order.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
          const deletedItem = order.items[itemIndex];
          order.items.splice(itemIndex, 1);
          order.total -= deletedItem.total;
          order.remaining = order.total - order.advance - order.secondAdvance;

          toast({
            title: "Produit supprimé",
            description: "Le produit a été supprimé de la commande",
          });
        }
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le produit",
          variant: "destructive"
        });
      }
    }
  };

  const handleDownload = async () => {
    if (!order || !client) return;

    try {
      // Créer un élément temporaire pour le PDF
      const element = document.createElement('div');
      element.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: 210mm;
        background: white;
        padding: 20mm;
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: black;
      `;

      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="margin-bottom: 15px;">
            <img src="/logo-essoukri.jpg" alt="ESSOUKRI - Artisans Pâtissiers depuis 1955" style="max-width: 300px; height: auto; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);" />
          </div>
          <h1 style="margin: 10px 0 0 0; font-size: 28px; color: #1f2937;">Bon de Commande</h1>
          <p style="margin: 5px 0; font-size: 16px; color: #6b7280;">N° ${order.orderNumber}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div>
            <strong>Date de commande:</strong> ${format(order.orderDate, 'dd/MM/yyyy')}<br>
            <strong>Date de livraison:</strong> ${format(order.deliveryDate, 'dd/MM/yyyy')}${order.deliveryTime ? ` à ${order.deliveryTime}` : ''}<br>
            <strong>Statut:</strong> ${order.status}
          </div>
          <div>
            <strong>Total:</strong> ${order.total.toFixed(2)} TND<br>
            <strong>Avance:</strong> ${order.advance.toFixed(2)} TND<br>
            <strong>Reste:</strong> ${order.remaining.toFixed(2)} TND
          </div>
        </div>

        <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h3 style="margin-top: 0;">Informations Client</h3>
          <strong style="font-size: 14px;">${client.name || 'N/A'}</strong><br>
          ${client.contact || 'N/A'}<br>
          ${client.address || 'N/A'}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Produit</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Quantité</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Prix Unitaire</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => {
              const product = getProduct(item.productId);
              return `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${product?.name || item.productId}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.description || '-'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity} ${product?.unit || ''}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.unitPrice.toFixed(2)} TND</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.total.toFixed(2)} TND</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 20px; font-size: 14px;">
          <div style="margin-bottom: 10px;"><strong>Sous-total: ${order.total + (order.discount || 0)} TND</strong></div>
          ${order.discount > 0 ? `<div style="margin-bottom: 10px; color: #dc2626;"><strong>Remise: -${order.discount.toFixed(2)} TND</strong></div>` : ''}
          <div style="margin-bottom: 10px; font-size: 16px; border-top: 1px solid #000; padding-top: 5px;"><strong>Total: ${order.total.toFixed(2)} TND</strong></div>
          <div style="margin-bottom: 10px;">Avance: ${order.advance.toFixed(2)} TND</div>
          ${order.secondAdvance > 0 ? `<div style="margin-bottom: 10px;">2ème Avance: ${order.secondAdvance.toFixed(2)} TND</div>` : ''}
          <div style="font-size: 16px; font-weight: bold; color: #2563eb;"><strong>Reste à payer: ${order.remaining.toFixed(2)} TND</strong></div>
        </div>

        <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #666;">
          <p>Merci de votre confiance - Essoukri Pâtisserie</p>
          <p>Ce document a été généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      `;

      document.body.appendChild(element);

      // Générer le canvas à partir de l'élément
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Supprimer l'élément temporaire
      document.body.removeChild(element);

      // Créer le PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Télécharger le PDF
      pdf.save(`BC-${order.orderNumber}.pdf`);

      toast({
        title: "PDF généré",
        description: `Le bon de commande ${order.orderNumber} a été téléchargé en PDF`,
      });

    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setNewQuantity(item.quantity);
    setNewDescription(item.description || '');
    setIsEditProductDialogOpen(true);
  };

  const openPaymentDialog = () => {
    setNewAdvance(order?.advance || 0);
    setNewSecondAdvance(order?.secondAdvance || 0);
    setIsPaymentDialogOpen(true);
  };

  const getOrderLaboratories = (order: any) => {
    // Grouper les produits par laboratoire basé sur leur catégorie
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

    const laboratories = new Set<string>();
    order.items.forEach((item: any) => {
      const product = products.find(p => p.id === item.productId);
      if (product && labMapping[product.category]) {
        laboratories.add(labMapping[product.category]);
      }
    });
    
    return Array.from(laboratories);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <p>Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    notFound();
  }

  const client = clients.find(c => c.id === order.clientId);
  const getProduct = (productId: string) => products.find(p => p.id === productId);
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div style={{ display: "none" }}>
            {order && client && <div ref={componentRef}><Invoice order={order} client={client} getProduct={getProduct} /></div>}
       </div>
      <div className="flex items-center justify-between space-y-2">
         <Link href="/orders">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Retour aux commandes</Button>
        </Link>
        <div className="flex gap-2">
          {(role === 'Admin' || role === 'Sales') && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsStatusDialogOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" /> Modifier Statut
              </Button>
              {(order.status === 'valide_admin' || order.status === 'Validé' || order.status === 'en_fabrication') && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/production/production-orders/new?orderId=${order.id}`)}
                >
                  <Factory className="mr-2 h-4 w-4" /> Générer OF
                </Button>
              )}
            </>
          )}
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Imprimer BC</Button>
          <Button variant="outline" onClick={handleDownload}><Download className="mr-2 h-4 w-4" /> Télécharger BC</Button>
          <Button variant="outline" onClick={() => router.push('/production/production-orders')}><Factory className="mr-2 h-4 w-4" /> Voir Ordres Production</Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Commande {order.orderNumber}</h1>
                            <p className="text-sm text-muted-foreground mt-1">Date de commande: {format(order.orderDate, 'dd/MM/yyyy')}</p>
                        </div>
                        <Badge variant="outline" className={cn("text-base border-transparent", statusColors[order.status])}>
                            {dbToLabel[order.status] || order.status}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                 <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Produits commandés</h3>
                      {(role === 'Admin' || role === 'Sales') && order.status === 'en_attente' && (
                        <Button 
                          onClick={() => setIsAddProductDialogOpen(true)}
                          size="sm"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Ajouter un produit
                        </Button>
                      )}
                    </div>
                    
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Produit</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Quantité</TableHead>
                                <TableHead className="text-right">Prix Unitaire</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items.map(item => {
                                const product = getProduct(item.productId);
                                return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {product && <ProductImage src={product.imageUrl} alt={product.name} width={64} height={64} className="rounded-md" />}
                                    </TableCell>
                                    <TableCell>{product?.name || 'N/A'}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                                    <TableCell className="text-right">{item.quantity} {product?.unit}</TableCell>
                                    <TableCell className="text-right">{item.unitPrice.toFixed(2)} TND</TableCell>
                                    <TableCell className="text-right font-medium">{item.total.toFixed(2)} TND</TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Détails de Paiement</span>
                        {(role === 'Admin' || role === 'Sales') && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={openPaymentDialog}
                            >
                                <DollarSign className="mr-2 h-4 w-4" />
                                Modifier Paiements
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-lg text-right">
                        <span className="text-muted-foreground">Total de la commande: </span>
                        <span className="font-bold">{order.total.toFixed(2)} TND</span>
                    </div>
                    {order.discount > 0 && (
                         <div className="text-lg text-destructive text-right">
                            <span className="text-muted-foreground">Remise: </span>
                            <span className="font-bold">- {order.discount.toFixed(2)} TND</span>
                        </div>
                    )}
                    <div className="text-lg text-right">
                        <span className="text-muted-foreground">Avance payée: </span>
                        <span className="font-bold">{order.advance.toFixed(2)} TND</span>
                    </div>
                     {order.secondAdvance > 0 && (
                        <div className="text-lg text-right">
                            <span className="text-muted-foreground">2ème Avance payée: </span>
                            <span className="font-bold">{order.secondAdvance.toFixed(2)} TND</span>
                        </div>
                    )}
                    <div className="text-2xl text-right">
                        <span className="text-muted-foreground">Reste à payer: </span>
                        <span className="font-bold text-primary">{order.remaining.toFixed(2)} TND</span>
                    </div>
                    <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Facture:</span>
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
                        </div>
                        {order.paymentType && (
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-muted-foreground">Type de paiement:</span>
                                <Badge variant="outline" className="text-xs">
                                    {order.paymentType === 'especes' ? 'Espèces' :
                                     order.paymentType === 'carte' ? 'Carte' :
                                     order.paymentType === 'cheque' ? 'Chèque' :
                                     order.paymentType === 'virement' ? 'Virement' :
                                     order.paymentType}
                                </Badge>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

        </div>
        <div className="space-y-8">
            <Card>
                 <CardHeader>
                    <CardTitle>Client</CardTitle>
                </CardHeader>
                {client && (
                    <CardContent className="text-sm space-y-2">
                        <p className="font-semibold text-lg">{client.name}</p>
                        <p className="text-muted-foreground">{client.address}</p>
                        <p className="text-muted-foreground">Contact: {client.contact}</p>
                        {client.taxId && <p className="text-muted-foreground">Matricule Fiscal: {client.taxId}</p>}
                    </CardContent>
                )}
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle>Livraison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="font-semibold text-lg">Date de livraison: {format(order.deliveryDate, 'dd/MM/yyyy')}</p>
                    {order.deliveryTime && (
                      <p className="font-medium text-base">Heure: {order.deliveryTime}</p>
                    )}
                    {client && <p className="text-sm text-muted-foreground">Adresse: {client.address}</p>}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Historique des Statuts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {order.statusHistory.map((statusChange, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className={cn("border-transparent", statusColors[statusChange.status])}>
                                    {dbToLabel[statusChange.status] || statusChange.status}
                                </Badge>
                                <div>
                                    <p className="text-sm font-medium">{format(statusChange.timestamp, 'dd/MM/yyyy')}</p>
                                    <p className="text-xs text-muted-foreground">{format(statusChange.timestamp, 'HH:mm:ss')}</p>
                                </div>
                            </div>
                            {statusChange.note && (
                                <p className="text-xs text-muted-foreground max-w-[200px]">{statusChange.note}</p>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Statuts des ordres de fabrication en temps réel */}
            <OrderProductionStatus orderId={order.id} />

            {/* Carte de livraison finale */}
            {order.status === 'livre' && (
              <Card className="border-green-300 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50">
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    Livraison Finale
                  </CardTitle>
                  <CardDescription>
                    Commande livrée le {format(order.deliveryDate, 'dd/MM/yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Statut de paiement */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Total commande</span>
                      <span className="text-lg font-bold">{order.total.toFixed(2)} TND</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-700">Avance payée</span>
                      <span className="text-base font-semibold text-blue-800">{order.advance.toFixed(2)} TND</span>
                    </div>

                    {order.secondAdvance > 0 && (
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-700">2ème Avance</span>
                        <span className="text-base font-semibold text-blue-800">{order.secondAdvance.toFixed(2)} TND</span>
                      </div>
                    )}

                    <div className={cn(
                      "flex justify-between items-center p-4 rounded-lg border-2",
                      order.remaining > 0
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-200"
                    )}>
                      <span className={cn(
                        "text-base font-bold",
                        order.remaining > 0 ? "text-red-800" : "text-green-800"
                      )}>
                        Reste à payer
                      </span>
                      <span className={cn(
                        "text-2xl font-bold",
                        order.remaining > 0 ? "text-red-600" : "text-green-600"
                      )}>
                        {order.remaining.toFixed(2)} TND
                      </span>
                    </div>

                    {order.remaining === 0 && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                          Paiement complet effectué
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Note de livraison */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-1">Note de livraison</p>
                        <p className="text-xs">
                          Merci de vérifier que tous les produits sont conformes.
                          En cas de problème, contactez-nous dans les 24h.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Carte pré-livraison pour les commandes prêtes */}
            {order.status === 'pret' && (
              <Card className="border-blue-300 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Clock className="h-5 w-5" />
                    Prêt pour Livraison
                  </CardTitle>
                  <CardDescription>
                    Date de livraison prévue: {format(order.deliveryDate, 'dd/MM/yyyy')}
                    {order.deliveryTime && ` à ${order.deliveryTime}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Total à payer</span>
                      <span className="text-lg font-bold">{order.total.toFixed(2)} TND</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-700">Déjà payé</span>
                      <span className="text-base font-semibold text-green-800">
                        {(order.advance + order.secondAdvance).toFixed(2)} TND
                      </span>
                    </div>

                    <div className={cn(
                      "flex justify-between items-center p-4 rounded-lg border-2",
                      order.remaining > 0
                        ? "bg-orange-50 border-orange-200"
                        : "bg-green-50 border-green-200"
                    )}>
                      <span className={cn(
                        "text-base font-bold",
                        order.remaining > 0 ? "text-orange-800" : "text-green-800"
                      )}>
                        À payer à la livraison
                      </span>
                      <span className={cn(
                        "text-2xl font-bold",
                        order.remaining > 0 ? "text-orange-600" : "text-green-600"
                      )}>
                        {order.remaining.toFixed(2)} TND
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>

      {/* Dialog pour modifier le statut */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut de la commande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Commande: {order.orderNumber}
            </div>
            <div className="text-sm">
              Statut actuel: <Badge className={cn("ml-2", statusColors[order.status])}>{dbToLabel[order.status] || order.status}</Badge>
            </div>
            <div>
              <label className="text-sm font-medium">Nouveau statut</label>
              <Select value={newStatus} onValueChange={(value: string) => setNewStatus(value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_attente">Saisi</SelectItem>
                  <SelectItem value="valide_admin">Validé par l'admin</SelectItem>
                  <SelectItem value="en_fabrication">En fabrication</SelectItem>
                  <SelectItem value="controle_qualite">Contrôle qualité</SelectItem>
                  <SelectItem value="pret">Prêt</SelectItem>
                  <SelectItem value="livre">Livré</SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Note (optionnel)</label>
              <Textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Raison du changement de statut..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleStatusChange}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Valider le changement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour générer les ordres de fabrication */}
      <Dialog open={isProductionOrdersDialogOpen} onOpenChange={setIsProductionOrdersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Génération des Ordres de Fabrication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Commande: {order.orderNumber} - {getOrderLaboratories(order).length} laboratoire(s) concerné(s)
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Laboratoires qui vont recevoir un ordre de fabrication:</h4>
              <div className="grid gap-2">
                {getOrderLaboratories(order).map((lab, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Factory className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{lab}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.items.filter((item: any) => {
                        const product = products.find(p => p.id === item.productId);
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
                        return product && labMapping[product.category] === lab;
                      }).length} produit(s)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Information:</strong> Un ordre de fabrication sera créé pour chaque laboratoire avec les produits correspondants. 
                Chaque ordre devra être validé par l'admin, puis par le contrôle qualité, puis par le contrôle quantité avant la fabrication.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductionOrdersDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleGenerateProductionOrders}>
              <Factory className="mr-2 h-4 w-4" />
              Générer les Ordres de Fabrication
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour ajouter un produit */}
      <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un produit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="product-select">Produit</Label>
              <Select value={newProductId} onValueChange={setNewProductId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <ProductImage 
                          src={product.imageUrl} 
                          alt={product.name} 
                          width={24} 
                          height={24} 
                          className="rounded" 
                        />
                        {product.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description (optionnel)</Label>
              <Input
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description personnalisée..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProductDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddProduct} disabled={!newProductId || newQuantity < 1}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour éditer un produit */}
      <Dialog open={isEditProductDialogOpen} onOpenChange={setIsEditProductDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingItem && (
              <>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  {(() => {
                    const product = products.find(p => p.id === editingItem.productId);
                    return product ? (
                      <ProductImage 
                        src={product.imageUrl} 
                        alt={product.name} 
                        width={48} 
                        height={48} 
                        className="rounded" 
                      />
                    ) : null;
                  })()}
                  <div>
                    <p className="font-medium">{(() => {
                      const product = products.find(p => p.id === editingItem.productId);
                      return product?.name || 'Produit inconnu';
                    })()}</p>
                    <p className="text-sm text-muted-foreground">
                      Prix unitaire: {(() => {
                        const product = products.find(p => p.id === editingItem.productId);
                        return product?.price.toFixed(2) || '0.00';
                      })()} TND
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-quantity">Quantité</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description (optionnel)</Label>
                  <Input
                    id="edit-description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Description personnalisée..."
                    className="mt-2"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditProduct} disabled={newQuantity < 1}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour modifier les paiements */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier les paiements</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground mb-4">
              Commande: {order.orderNumber} - Total: {order.total.toFixed(2)} TND
            </div>
            
            <div>
              <Label htmlFor="advance">Première avance (TND)</Label>
              <Input
                id="advance"
                type="number"
                min="0"
                max={order.total}
                step="0.01"
                value={newAdvance}
                onChange={(e) => setNewAdvance(parseFloat(e.target.value) || 0)}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="secondAdvance">Deuxième avance (TND)</Label>
              <Input
                id="secondAdvance"
                type="number"
                min="0"
                max={order.total - newAdvance}
                step="0.01"
                value={newSecondAdvance}
                onChange={(e) => setNewSecondAdvance(parseFloat(e.target.value) || 0)}
                className="mt-2"
              />
            </div>

            <div className="bg-muted p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Total commande:</span>
                <span className="font-medium">{order.total.toFixed(2)} TND</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total avances:</span>
                <span className="font-medium">{(newAdvance + newSecondAdvance).toFixed(2)} TND</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
                <span>Reste à payer:</span>
                <span className={`${(order.total - newAdvance - newSecondAdvance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {(order.total - newAdvance - newSecondAdvance).toFixed(2)} TND
                </span>
              </div>
              {(newAdvance + newSecondAdvance) > order.total && (
                <div className="text-xs text-red-600 mt-2">
                  ⚠️ Le total des avances dépasse le montant de la commande
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handlePaymentUpdate}
              disabled={(newAdvance + newSecondAdvance) > order.total}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    