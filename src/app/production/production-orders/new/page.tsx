'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Factory,
  Clock,
  AlertCircle,
  X
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ProductImage from '@/components/product-image';
import { getValidatedOrders, getClients, getProducts, createProductionOrderWithDeliveryDate, checkOrderAlreadyInProduction } from '@/lib/supabase-service';
import type { Order, Client, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  productId: string;
  quantity: number;
  instructions: string;
}

interface NewProductionOrder {
  selectedOrders: string[]; // Maintenant on peut sélectionner plusieurs BC
  title: string; // Titre personnalisé
  laboratory: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  deliveryDate: string;
  deliveryTime: string;
  productionDeliveryDate: string; // Date de livraison production
  productionDeliveryTime: string; // Heure de livraison production
  items: OrderItem[];
  notes: string;
}

const laboratories = [
  'Labo traditionnel',
  'Laboratoire biscuit',
  'Viennoiserie',
  'Laboratoire cheese',
  'Laboratoire gâteaux français'
];

const priorityConfig = {
  low: { label: 'Basse', color: 'bg-gray-100 text-gray-800', icon: Clock },
  normal: { label: 'Normale', color: 'bg-blue-100 text-blue-800', icon: Clock },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800', icon: AlertCircle }
};

function NewProductionOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [order, setOrder] = useState<NewProductionOrder>({
    selectedOrders: [],
    title: '',
    laboratory: '',
    priority: 'normal',
    deliveryDate: '',
    deliveryTime: '08:00',
    productionDeliveryDate: '',
    productionDeliveryTime: '06:00',
    items: [],
    notes: ''
  });

  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [instructions, setInstructions] = useState<string>('');
  const [productSearchTerm, setProductSearchTerm] = useState<string>('');

  // Données réelles depuis Supabase
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersData, clientsData, productsData] = await Promise.all([
          getValidatedOrders(),
          getClients(),
          getProducts()
        ]);
        setOrders(ordersData);
        setClients(clientsData);
        setProducts(productsData);

        // Pré-sélectionner un BC si l'orderId est passé en paramètre
        const preselectedOrderId = searchParams.get('orderId');
        if (preselectedOrderId && ordersData.some(o => o.id === preselectedOrderId)) {
          const selectedOrder = ordersData.find(o => o.id === preselectedOrderId);
          if (selectedOrder) {
            setOrder(prev => ({
              ...prev,
              selectedOrders: [preselectedOrderId],
              deliveryDate: new Date(selectedOrder.deliveryDate).toISOString().split('T')[0],
              deliveryTime: selectedOrder.deliveryTime || '08:00',
              productionDeliveryDate: new Date(selectedOrder.deliveryDate).toISOString().split('T')[0]
            }));

            toast({
              title: "BC pré-sélectionné",
              description: `Le bon de commande ${selectedOrder.orderNumber} a été automatiquement sélectionné`,
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast, searchParams]);

  // Fonction de débogage
  const debugState = () => {
    console.log('État actuel:', {
      order,
      selectedProduct,
      quantity,
      instructions
    });
  };

  const addItem = () => {
    if (!selectedProduct || quantity <= 0) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const newItem: OrderItem = {
      productId: selectedProduct,
      quantity,
      instructions: instructions.trim() || 'Préparer selon la recette standard'
    };

    console.log('Ajout d\'un nouvel item:', newItem);

    setOrder(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset form
    setSelectedProduct('');
    setQuantity(1);
    setInstructions('');
  };

  const removeItem = (index: number) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemInstructions = (index: number, instructions: string) => {
    console.log(`Mise à jour des instructions pour l'item ${index}:`, instructions);
    setOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, instructions } : item
      )
    }));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    setOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, quantity } : item
      )
    }));
  };

  const generateOrder = async () => {
    if (order.selectedOrders.length === 0 || !order.laboratory || !order.deliveryDate || !order.deliveryTime || !order.productionDeliveryDate || !order.productionDeliveryTime || order.items.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins une BC, remplir tous les champs obligatoires et ajouter au moins un produit",
        variant: "destructive"
      });
      return;
    }

    try {
      const productionOrder = await createProductionOrderWithDeliveryDate({
        orderIds: order.selectedOrders,
        laboratory: order.laboratory,
        title: order.title || `OF ${order.laboratory} - ${new Date().toLocaleDateString()}`,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unit: products.find(p => p.id === item.productId)?.unit || 'pièce',
          notes: item.instructions
        })),
        targetDate: new Date(`${order.deliveryDate}T${order.deliveryTime}`),
        deliveryDate: new Date(`${order.productionDeliveryDate}T${order.productionDeliveryTime}`),
        priority: order.priority,
        notes: order.notes
      });

      if (productionOrder) {
        toast({
          title: "Ordre de fabrication créé",
          description: `L'ordre ${productionOrder.orderNumber} a été créé avec succès`,
        });
        router.push('/production/production-orders');
      } else {
        throw new Error('Échec de la création');
      }
    } catch (error) {
      console.error('Console Error: Erreur lors de la création de l\'ordre de production:', error);
      console.error('Console Error: Type d\'erreur:', typeof error);
      console.error('Console Error: Erreur stringifiée:', JSON.stringify(error, null, 2));
      console.error('Console Error: Propriétés de l\'erreur:', Object.keys(error || {}));

      let errorMessage = "Impossible de créer l'ordre de fabrication";
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      }

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Gestion de la sélection multiple des BC
  const toggleOrderSelection = async (orderId: string) => {
    // Si on désélectionne, pas besoin de vérifier
    if (order.selectedOrders.includes(orderId)) {
      setOrder(prev => ({
        ...prev,
        selectedOrders: prev.selectedOrders.filter(id => id !== orderId)
      }));
      return;
    }

    // Vérifier si la commande est déjà utilisée dans d'autres OF
    const checkResult = await checkOrderAlreadyInProduction(orderId);

    if (checkResult.isUsed) {
      const orderItem = orders.find(o => o.id === orderId);
      toast({
        title: "⚠️ Commande déjà en production",
        description: `La commande ${orderItem?.orderNumber} est déjà utilisée dans ${checkResult.productionOrders.length} ordre(s) de fabrication: ${checkResult.productionOrders.join(', ')}`,
        variant: "destructive"
      });

      // Toujours permettre l'ajout mais avec avertissement
      toast({
        title: "Information",
        description: "Vous pouvez quand même utiliser cette commande, mais attention aux doublons.",
        variant: "default"
      });
    }

    // Ajouter la commande
    const selectedOrder = orders.find(o => o.id === orderId);

    setOrder(prev => {
      const updatedOrder = {
        ...prev,
        selectedOrders: [...prev.selectedOrders, orderId]
      };

      // Préremplacer les dates avec celles du BC sélectionné (si c'est la première sélection)
      if (prev.selectedOrders.length === 0 && selectedOrder) {
        const bcDeliveryDate = new Date(selectedOrder.deliveryDate);
        const formattedDate = bcDeliveryDate.toISOString().split('T')[0]; // Format YYYY-MM-DD

        updatedOrder.deliveryDate = formattedDate;
        updatedOrder.productionDeliveryDate = formattedDate;

        // Si le BC a une heure de livraison, l'utiliser
        if (selectedOrder.deliveryTime) {
          updatedOrder.deliveryTime = selectedOrder.deliveryTime;
        }

        console.log('📅 Dates pré-remplies depuis BC:', {
          orderNumber: selectedOrder.orderNumber,
          deliveryDate: formattedDate,
          deliveryTime: selectedOrder.deliveryTime
        });

        toast({
          title: "Dates pré-remplies",
          description: `Les dates ont été pré-remplies avec celles du BC ${selectedOrder.orderNumber}`,
          variant: "default"
        });
      }

      return updatedOrder;
    });
  };

  const removeSelectedOrder = (orderId: string) => {
    setOrder(prev => ({
      ...prev,
      selectedOrders: prev.selectedOrders.filter(id => id !== orderId)
    }));
  };

  const getProductById = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const getPriorityIcon = (priority: string) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  };

  // Filtrer les produits selon le terme de recherche
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (product.subFamily && product.subFamily.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  // Importer les produits des BC sélectionnées
  const importProductsFromSelectedBCs = () => {
    if (order.selectedOrders.length === 0) return;

    const importedItems: OrderItem[] = [];

    order.selectedOrders.forEach(orderId => {
      const existingOrder = orders.find(o => o.id === orderId);
      if (existingOrder) {
        existingOrder.items.forEach(item => {
          importedItems.push({
            productId: item.productId,
            quantity: item.quantity,
            instructions: `Importé du BC ${existingOrder.orderNumber}`
          });
        });
      }
    });

    setOrder(prev => ({
      ...prev,
      items: [...prev.items, ...importedItems]
    }));

    toast({
      title: "Produits importés",
      description: `${importedItems.length} produits importés depuis ${order.selectedOrders.length} BC`,
    });
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/production/production-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux ordres
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nouvel Ordre de Fabrication</h1>
            <p className="text-muted-foreground mt-1">
              Créer un nouvel ordre de fabrication avec priorités et instructions
            </p>
          </div>
        </div>
      </div>

      {/* Bouton de débogage */}
      <Button onClick={debugState} variant="outline" size="sm">
        Debug State
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulaire principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Titre personnalisé */}
              <div>
                <Label htmlFor="title">Titre de l'ordre (optionnel)</Label>
                <Input
                  id="title"
                  placeholder="ex: Commande urgente gâteaux français"
                  value={order.title}
                  onChange={(e) => setOrder(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-2"
                />
              </div>

              {/* Sélection multiple des BC */}
              <div>
                <Label>Bons de Commande * (sélection multiple)</Label>
                <div className="mt-2 space-y-2">
                  {/* BC sélectionnées */}
                  {order.selectedOrders.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-muted/20">
                      {order.selectedOrders.map(orderId => {
                        const orderItem = orders.find(o => o.id === orderId);
                        const client = clients.find(c => c.id === orderItem?.clientId);
                        return (
                          <Badge key={orderId} variant="default" className="flex items-center gap-1">
                            {orderItem?.orderNumber} - {client?.name}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSelectedOrder(orderId)}
                              className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Liste des BC disponibles */}
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {orders.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Aucun bon de commande disponible
                      </div>
                    ) : (
                      orders.map((orderItem) => {
                        const client = clients.find(c => c.id === orderItem.clientId);
                        const isSelected = order.selectedOrders.includes(orderItem.id);
                        return (
                          <div
                            key={orderItem.id}
                            className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                              isSelected ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => toggleOrderSelection(orderItem.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => {}} // Géré par le click du parent
                            />
                            <div className="flex-1">
                              <div className="font-medium">{orderItem.orderNumber}</div>
                              <div className="text-xs text-muted-foreground">
                                {client?.name} • {orderItem.status === 'Validé' ? "Validé par l'admin" : orderItem.status} • {new Date(orderItem.deliveryDate).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {orderItem.items.length} produits
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="laboratory">Laboratoire *</Label>
                  <Select value={order.laboratory} onValueChange={(value) => setOrder(prev => ({ ...prev, laboratory: value }))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner un laboratoire" />
                    </SelectTrigger>
                    <SelectContent>
                      {laboratories.map((lab) => (
                        <SelectItem key={lab} value={lab}>{lab}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priorité *</Label>
                  <Select 
                    value={order.priority} 
                    onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => {
                      console.log('Changement de priorité:', value);
                      setOrder(prev => ({ ...prev, priority: value }));
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(key)}
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="deliveryDate">Date de livraison *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={order.deliveryDate}
                    onChange={(e) => setOrder(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryTime">Heure de livraison *</Label>
                  <Input
                    id="deliveryTime"
                    type="time"
                    value={order.deliveryTime}
                    onChange={(e) => setOrder(prev => ({ ...prev, deliveryTime: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Dates de production */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <Factory className="w-4 h-4" />
                  Livraison Production
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="productionDeliveryDate">Date de livraison production *</Label>
                    <Input
                      id="productionDeliveryDate"
                      type="date"
                      value={order.productionDeliveryDate}
                      onChange={(e) => setOrder(prev => ({ ...prev, productionDeliveryDate: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productionDeliveryTime">Heure de livraison production *</Label>
                    <Input
                      id="productionDeliveryTime"
                      type="time"
                      value={order.productionDeliveryTime}
                      onChange={(e) => setOrder(prev => ({ ...prev, productionDeliveryTime: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* Bouton d'importation depuis BC */}
              {order.selectedOrders.length > 0 && (
                <div className="pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={importProductsFromSelectedBCs}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Importer les produits des BC sélectionnées ({order.selectedOrders.length})
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Ceci ajoutera tous les produits des bons de commande sélectionnés à l'ordre de fabrication
                  </p>
                </div>
              )}

              {/* Notes générales */}
              <div>
                <Label htmlFor="notes">Notes générales (optionnel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Notes et instructions générales pour cet ordre de fabrication..."
                  value={order.notes}
                  onChange={(e) => setOrder(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ajout de produits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Ajouter des produits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Champ de recherche de produits */}
              <div>
                <Label htmlFor="productSearch">Rechercher un produit</Label>
                <Input
                  id="productSearch"
                  placeholder="Rechercher par nom, catégorie ou famille..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="product">Produit * ({filteredProducts.length} produits)</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner un produit" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {filteredProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            <ProductImage
                              src={product.imageUrl}
                              alt={product.name}
                              width={24}
                              height={24}
                              className="rounded"
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{product.name}</span>
                              <span className="text-xs text-muted-foreground">{product.category} - {product.subFamily}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground">
                          Aucun produit trouvé pour "{productSearchTerm}"
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">
                    Quantité * {selectedProduct && (() => {
                      const product = products.find(p => p.id === selectedProduct);
                      return product ? `(${product.unit})` : '';
                    })()}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="mt-2"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addItem} disabled={!selectedProduct || quantity <= 0} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </div>

              {/* Instructions spéciales */}
              <div>
                <Label htmlFor="instructions">Instructions spéciales (optionnel)</Label>
                <Textarea
                  id="instructions"
                  placeholder="Instructions de fabrication spécifiques pour ce produit..."
                  value={instructions}
                  onChange={(e) => {
                    console.log('Changement des instructions:', e.target.value);
                    setInstructions(e.target.value);
                  }}
                  className="mt-2"
                  rows={3}
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Instructions actuelles: {instructions || 'Aucune'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Produits sélectionnés */}
          {order.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Produits à fabriquer ({order.items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item, index) => {
                    const product = getProductById(item.productId);
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          {/* Photo du produit */}
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <ProductImage
                              src={product?.imageUrl}
                              alt={product?.name || ''}
                              fill
                              className=""
                              sizes="80px"
                            />
                          </div>
                          
                          {/* Informations du produit */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold">{product?.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  ID: {item.productId}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Quantité */}
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <Label className="text-sm">Quantité</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Unité</Label>
                                <div className="mt-1 px-3 py-2 bg-muted rounded text-sm font-medium">
                                  {product?.unit || 'N/A'}
                                </div>
                              </div>
                            </div>
                            
                            {/* Instructions */}
                            <div>
                              <Label className="text-sm">Instructions spéciales</Label>
                              <Textarea
                                placeholder="Instructions de fabrication..."
                                value={item.instructions}
                                onChange={(e) => updateItemInstructions(index, e.target.value)}
                                className="mt-1"
                                rows={2}
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                Instructions: {item.instructions}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
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
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">BC Sélectionnées</span>
                  {order.selectedOrders.length === 0 ? (
                    <span className="font-semibold text-muted-foreground">Aucune</span>
                  ) : (
                    <div className="space-y-1">
                      {order.selectedOrders.map(orderId => {
                        const orderItem = orders.find(o => o.id === orderId);
                        return (
                          <Badge key={orderId} variant="outline" className="text-xs">
                            {orderItem?.orderNumber}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Titre</span>
                  <span className="font-semibold text-sm">{order.title || 'Auto-généré'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Laboratoire</span>
                  <span className="font-semibold">{order.laboratory || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priorité</span>
                  {order.priority && (
                    <Badge className={priorityConfig[order.priority].color}>
                      {getPriorityIcon(order.priority)}
                      {priorityConfig[order.priority].label}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date livraison</span>
                  <span className="font-semibold">{order.deliveryDate || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heure livraison</span>
                  <span className="font-semibold">{order.deliveryTime || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total produits</span>
                  <span className="font-semibold">{order.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantité totale</span>
                  <span className="font-semibold">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={generateOrder}
                className="w-full"
                disabled={order.selectedOrders.length === 0 || !order.laboratory || !order.deliveryDate || !order.deliveryTime || order.items.length === 0}
              >
                <Factory className="mr-2 h-4 w-4" />
                Générer l'Ordre de Fabrication
              </Button>
              
              <Button variant="outline" className="w-full" onClick={() => router.push('/production/production-orders')}>
                Annuler
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewProductionOrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewProductionOrderPageContent />
    </Suspense>
  );
}
