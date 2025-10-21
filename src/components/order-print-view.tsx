'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Printer, 
  Download, 
  FileText, 
  Calendar, 
  User, 
  Phone, 
  MapPin,
  Package,
  DollarSign,
  CheckCircle
} from 'lucide-react';
import Image from 'next/image';
import { useReactToPrint } from 'react-to-print';
import { Logo } from '@/components/logo';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  description: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Order {
  id: string;
  orderNumber: string;
  client: Client;
  items: OrderItem[];
  status: string;
  createdAt: Date;
  deliveryDate: Date;
  advance: number;
  discount: number;
  total: number;
  remaining: number;
}

interface OrderPrintViewProps {
  order: Order;
  onClose?: () => void;
}

export function OrderPrintView({ order, onClose }: OrderPrintViewProps) {
  // Hook pour récupérer le rôle utilisateur
  let currentRole = 'Admin';
  try {
    const { useRole } = require('@/hooks/use-role');
    const roleHook = useRole();
    currentRole = roleHook?.role || 'Admin';
  } catch {
    // Fallback si le hook n'est pas disponible
    currentRole = 'Admin';
  }
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `BC-${order.orderNumber}`,
    onAfterPrint: () => {
      console.log('Impression terminée');
    }
  });

  const handleDownload = () => {
    // Créer le contenu HTML pour le téléchargement
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BC-${order.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .order-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .client-info { margin-bottom: 30px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items-table th { background-color: #f8f9fa; }
          .totals { text-align: right; margin-top: 20px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
          @media print { body { margin: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Essoukri Pâtisserie</div>
          <h1>Bon de Commande</h1>
          <p>N° ${order.orderNumber}</p>
        </div>
        
        <div class="order-info">
          <div>
            <strong>Date de commande:</strong> ${format(order.createdAt, 'dd/MM/yyyy', { locale: fr })}<br>
            <strong>Date de livraison:</strong> ${format(order.deliveryDate, 'dd/MM/yyyy', { locale: fr })}<br>
            <strong>Statut:</strong> ${order.status}
          </div>
          <div>
            <strong>Total:</strong> ${order.total.toFixed(2)} TND<br>
            <strong>Avance:</strong> ${order.advance.toFixed(2)} TND<br>
            <strong>Reste:</strong> ${order.remaining.toFixed(2)} TND
          </div>
        </div>
        
        <div class="client-info">
          <h3>Informations Client</h3>
          <strong>${order.client.name}</strong><br>
          ${order.client.email}<br>
          ${order.client.phone}<br>
          ${order.client.address}
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Description</th>
              <th>Quantité</th>
              <th>Prix Unitaire</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.productId}</td>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${item.unitPrice.toFixed(2)} TND</td>
                <td>${item.total.toFixed(2)} TND</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <p><strong>Total: ${order.total.toFixed(2)} TND</strong></p>
          ${order.discount > 0 ? `<p>Remise: -${order.discount.toFixed(2)} TND</p>` : ''}
          <p><strong>Reste à payer: ${order.remaining.toFixed(2)} TND</strong></p>
        </div>
        
        <div class="footer">
          <p>Merci de votre confiance - Essoukri Pâtisserie</p>
          <p>Ce document a été généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </body>
      </html>
    `;

    // Créer le blob et télécharger
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BC-${order.orderNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Saisi': return 'bg-gray-100 text-gray-800';
      case 'En attente': return 'bg-yellow-100 text-yellow-800';
      case 'En fabrication': return 'bg-blue-100 text-blue-800';
      case 'Terminé': return 'bg-green-100 text-green-800';
      case 'Livré': return 'bg-green-100 text-green-800';
      case 'Annulé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête avec actions */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Bon de Commande - {order.orderNumber}</h2>
            <p className="text-muted-foreground">
              Prévisualisation pour impression et téléchargement
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
            <Button onClick={handleDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="outline">
                Fermer
              </Button>
            )}
          </div>
        </div>

        {/* Contenu imprimable */}
        <div ref={printRef} className="p-6">
          {/* En-tête de la page */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo variant="large" />
            </div>
            <div className="text-lg font-semibold text-primary mb-2">Artisans Pâtissiers depuis 1955</div>
            <h1 className="text-2xl font-bold">Bon de Commande</h1>
            <div className="text-lg text-muted-foreground">N° {order.orderNumber}</div>
          </div>

          {/* Informations de la commande */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations de la commande
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Date de commande:</span>
                    <span className="font-medium">{format(order.createdAt, 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Date de livraison:</span>
                    <span className="font-medium">{format(order.deliveryDate, 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Statut:</span>
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                  </div>
                </div>
                {currentRole !== 'Quality' && currentRole !== 'Hygiene' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="font-bold text-lg">{order.total.toFixed(2)} TND</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Avance:</span>
                      <span className="font-medium">{order.advance.toFixed(2)} TND</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Reste à payer:</span>
                      <span className="font-bold text-primary">{order.remaining.toFixed(2)} TND</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informations client */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Nom:</span>
                    <span className="font-medium">{order.client.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Téléphone:</span>
                    <span className="font-medium">{order.client.phone}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="font-medium">{order.client.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Adresse:</span>
                    <span className="font-medium">{order.client.address}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Produits commandés */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produits commandés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-medium">#{index + 1}</div>
                        <div>
                          <h4 className="font-semibold">Produit {item.productId}</h4>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{item.quantity}</div>
                        <div className="text-sm text-muted-foreground">quantité</div>
                      </div>
                      {currentRole !== 'Quality' && currentRole !== 'Hygiene' && (
                        <>
                          <div className="text-right">
                            <div className="text-lg font-bold">{item.unitPrice.toFixed(2)} TND</div>
                            <div className="text-sm text-muted-foreground">prix unitaire</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-primary">{item.total.toFixed(2)} TND</div>
                            <div className="text-sm text-muted-foreground">total</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Résumé financier - masqué pour service hygiène et qualité */}
          {currentRole !== 'Quality' && currentRole !== 'Hygiene' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Résumé financier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Sous-total:</span>
                    <span className="font-medium">{order.total.toFixed(2)} TND</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Remise:</span>
                      <span className="font-medium">-{order.discount.toFixed(2)} TND</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{order.total.toFixed(2)} TND</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avance versée:</span>
                    <span className="font-medium">{order.advance.toFixed(2)} TND</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xl font-bold text-primary">
                    <span>Reste à payer:</span>
                    <span>{order.remaining.toFixed(2)} TND</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pied de page */}
          <div className="text-center text-muted-foreground mt-12">
            <p className="text-lg font-medium">Merci de votre confiance</p>
            <div className="flex justify-center my-2">
              <Logo variant="small" />
            </div>
            <p className="text-xs font-semibold">Artisans Pâtissiers depuis 1955</p>
            <p className="text-xs mt-2">
              Ce document a été généré automatiquement le {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
