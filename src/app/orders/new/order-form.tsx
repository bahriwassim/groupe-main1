'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createOrder, getProducts } from '@/lib/supabase-service';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import ProductImage from '@/components/product-image';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// Schéma de validation pour un article de commande
const orderItemSchema = z.object({
  productId: z.string().min(1, 'Produit requis'),
  quantity: z.number().min(1, 'Quantité doit être au moins 1'),
  unitPrice: z.number(),
  total: z.number(),
  description: z.string().optional(),
});

// Schéma de validation pour le formulaire complet
const formSchema = z.object({
  clientName: z.string().min(1, 'Le nom du client est requis'),
  clientPhone: z.string().optional(),
  clientPhone2: z.string().optional(),
  clientTaxId: z.string().optional(),
  clientAddress: z.string().optional(),
  deliveryDate: z.date({ required_error: 'Date de livraison requise' }),
  deliveryTime: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Au moins un article est requis'),
  hasDiscount: z.boolean().default(false),
  discount: z.number().min(0).optional(),
  advance: z.number().min(0).optional(),
  hasSecondAdvance: z.boolean().default(false),
  secondAdvance: z.number().min(0).optional(),
  paymentType: z.enum(['especes', 'carte', 'cheque', 'virement']).optional(),
  needsInvoice: z.boolean().default(false),
  notes: z.string().optional(),
});

type OrderFormValues = z.infer<typeof formSchema>;

// Modal de sélection de produits
const ProductSelectionModal = ({
  onSelectProduct,
  onOpenChange
}: {
  onSelectProduct: (product: Product) => void;
  onOpenChange: (open: boolean) => void;
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await getProducts();
        setProducts(productsData);
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const filteredProducts = React.useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [products, searchTerm]
  );

  return (
    <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Sélectionner un produit</DialogTitle>
        <DialogDescription>
          <Input
            placeholder="Rechercher par nom, ID ou catégorie..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="mt-4"
          />
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p>Chargement des produits...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  onSelectProduct(product);
                  onOpenChange(false);
                }}
              >
                <CardHeader className="p-0">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    width={200}
                    height={150}
                    className="w-full h-32 object-cover rounded-t-lg"
                  />
                </CardHeader>
                <CardContent className="p-3">
                  <p className="font-semibold text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                </CardContent>
                <CardFooter className="p-3 flex justify-between items-center text-xs">
                  <Badge variant="secondary">{product.category}</Badge>
                  <span className="font-bold">{product.price.toFixed(2)} TND / {product.unit}</span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DialogContent>
  );
};

// Composant principal du formulaire
export default function OrderForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isProductModalOpen, setProductModalOpen] = React.useState(false);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Charger les produits au montage
  React.useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await getProducts();
        setProducts(productsData);
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les produits",
          variant: "destructive"
        });
      }
    };
    loadProducts();
  }, [toast]);

  // Initialiser le formulaire avec React Hook Form et Zod
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      clientPhone: '',
      clientPhone2: '',
      clientTaxId: '',
      clientAddress: '',
      deliveryDate: new Date(),
      deliveryTime: '12:00',
      items: [],
      advance: 0,
      secondAdvance: 0,
      discount: 0,
      paymentType: 'especes',
      needsInvoice: false,
      notes: '',
      hasDiscount: false,
      hasSecondAdvance: false,
    },
  });

  // Gérer les articles avec useFieldArray
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Watchers pour calculer les totaux en temps réel
  const watchItems = form.watch('items');
  const watchAdvance = form.watch('advance');
  const watchSecondAdvance = form.watch('secondAdvance');
  const watchDiscount = form.watch('discount');
  const watchHasDiscount = form.watch('hasDiscount');
  const watchHasSecondAdvance = form.watch('hasSecondAdvance');

  // Calculs des totaux
  const subtotal = watchItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - (watchHasDiscount ? (watchDiscount || 0) : 0);
  const remaining = total - (watchAdvance || 0) - (watchHasSecondAdvance ? (watchSecondAdvance || 0) : 0);

  // Fonction de soumission du formulaire
  async function onSubmit(data: OrderFormValues) {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Préparer les données de commande
      const orderData = {
        clientId: 'new',
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientPhone2: data.clientPhone2,
        clientTaxId: data.clientTaxId,
        clientAddress: data.clientAddress,
        deliveryDate: data.deliveryDate,
        deliveryTime: data.deliveryTime,
        items: data.items,
        total,
        discount: data.hasDiscount ? (data.discount || 0) : 0,
        advance: data.advance || 0,
        secondAdvance: data.hasSecondAdvance ? (data.secondAdvance || 0) : 0,
        paymentType: data.paymentType,
        needsInvoice: data.needsInvoice,
        notes: data.notes
      };

      console.log('📋 Données du formulaire:', data);
      console.log('📦 Données envoyées à createOrder:', orderData);
      console.log('📊 Détails des articles:', JSON.stringify(data.items, null, 2));
      console.log('💰 Calculs:', {
        subtotal,
        discount: data.hasDiscount ? (data.discount || 0) : 0,
        total,
        advance: data.advance || 0,
        secondAdvance: data.hasSecondAdvance ? (data.secondAdvance || 0) : 0,
        remaining
      });

      // Créer la commande
      const newOrder = await createOrder(orderData);

      if (newOrder) {
        toast({
          title: "Commande créée",
          description: `Le bon de commande ${newOrder.orderNumber} pour ${data.clientName} a été enregistré avec succès.`,
        });

        form.reset();
        router.push(`/orders/${newOrder.id}`);
      } else {
        throw new Error('Aucune commande retournée');
      }
    } catch (error: any) {
      console.error('❌ ERREUR lors de la création:', error);

      let errorMessage = "Une erreur est survenue lors de la création de la commande.";

      if (error?.message) {
        errorMessage = error.message;
      }

      if (error?.details) {
        errorMessage += `\n\nDétails: ${error.details}`;
      }

      if (error?.hint) {
        errorMessage += `\n\nSuggestion: ${error.hint}`;
      }

      toast({
        title: "Erreur de création",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Ajouter un produit au formulaire
  const addProduct = (product: Product) => {
    append({
      productId: product.id,
      quantity: 1,
      unitPrice: product.price,
      total: product.price,
      description: '',
    });
  };

  // Récupérer un produit par son ID
  const getProduct = (productId: string) => products.find((p) => p.id === productId);

  // Gérer le changement de quantité
  const handleQuantityChange = (index: number, quantity: number) => {
    const unitPrice = form.getValues(`items.${index}.unitPrice`);
    update(index, {
      ...form.getValues(`items.${index}`),
      quantity: quantity,
      total: unitPrice * quantity,
    });
  };

  return (
    <Form {...form}>
      <Dialog open={isProductModalOpen} onOpenChange={setProductModalOpen}>
        <ProductSelectionModal onSelectProduct={addProduct} onOpenChange={setProductModalOpen} />
      </Dialog>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Section: Informations Client */}
        <Card>
          <CardHeader>
            <CardTitle>Informations Client</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du client *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom complet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="Numéro de téléphone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientPhone2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone 2 (optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Deuxième numéro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientTaxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>M.F (Matricule Fiscal)</FormLabel>
                  <FormControl>
                    <Input placeholder="Matricule fiscal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientAddress"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Adresse complète du client" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section: Détails de Livraison */}
        <Card>
          <CardHeader>
            <CardTitle>Détails de Livraison</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="deliveryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date de Livraison *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy')
                          ) : (
                            <span>Choisissez une date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliveryTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heure de Livraison</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="time" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section: Articles */}
        <Card>
          <CardHeader>
            <CardTitle>Articles de la commande</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => {
                const product = getProduct(field.productId);
                return (
                  <div key={field.id} className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex gap-4 items-start">
                      {product && (
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          width={80}
                          height={80}
                          className="rounded-md object-cover"
                        />
                      )}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="col-span-2">
                          <FormLabel>Désignation</FormLabel>
                          <p className="font-semibold">{product?.name}</p>
                          <p className="text-xs text-muted-foreground">{product?.category}</p>
                        </div>

                        <div className="flex items-end gap-2">
                          <div className="flex-grow">
                            <FormLabel>Quantité</FormLabel>
                            <Input
                              type="number"
                              min="1"
                              step="any"
                              {...form.register(`items.${index}.quantity`, {
                                valueAsNumber: true,
                                onChange: (e) => handleQuantityChange(index, parseFloat(e.target.value) || 1)
                              })}
                            />
                          </div>
                          {product && <span className="text-sm pb-2">({product.unit})</span>}
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Prix unitaire</p>
                          <p className="font-medium">{field.unitPrice.toFixed(2)} TND</p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="font-semibold text-lg">{field.total.toFixed(2)} TND</p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description / Personnalisation (optionnel)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ajouter une note ou une personnalisation pour cet article..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setProductModalOpen(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              Parcourir les produits
            </Button>

            {form.formState.errors.items && (
              <FormMessage className="mt-2">
                Veuillez ajouter au moins un produit à la commande
              </FormMessage>
            )}
          </CardContent>
        </Card>

        {/* Section: Paiement */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de Paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="advance"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Avance (TND)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasDiscount"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Appliquer une remise
                  </FormLabel>
                </FormItem>
              )}
            />

            {watchHasDiscount && (
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Montant de la remise (TND)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="hasSecondAdvance"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Ajouter une deuxième avance
                  </FormLabel>
                </FormItem>
              )}
            />

            {watchHasSecondAdvance && (
              <FormField
                control={form.control}
                name="secondAdvance"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Montant de la 2ème avance (TND)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Type de paiement</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir le type de paiement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="especes">Espèces</SelectItem>
                        <SelectItem value="carte">Carte</SelectItem>
                        <SelectItem value="cheque">Chèque</SelectItem>
                        <SelectItem value="virement">Virement</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="needsInvoice"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Avec facture
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes supplémentaires (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes, instructions spéciales, etc..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex flex-col items-end gap-2 text-right border-t pt-6">
            <div className="text-lg">
              <span className="text-muted-foreground">Sous-total: </span>
              <span className="font-bold">{subtotal.toFixed(2)} TND</span>
            </div>

            {watchHasDiscount && watchDiscount && watchDiscount > 0 && (
              <div className="text-lg text-destructive">
                <span className="text-muted-foreground">Remise: </span>
                <span className="font-bold">- {watchDiscount.toFixed(2)} TND</span>
              </div>
            )}

            <div className="text-xl border-t pt-2 w-full">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-bold text-primary">{total.toFixed(2)} TND</span>
            </div>

            <div className="text-base">
              <span className="text-muted-foreground">Avance(s) versée(s): </span>
              <span className="font-medium">
                {((watchAdvance || 0) + (watchHasSecondAdvance ? (watchSecondAdvance || 0) : 0)).toFixed(2)} TND
              </span>
            </div>

            <div className="text-xl font-bold">
              <span className="text-muted-foreground">Reste à payer: </span>
              <span className={remaining > 0 ? 'text-orange-600' : 'text-green-600'}>
                {remaining.toFixed(2)} TND
              </span>
            </div>
          </CardFooter>
        </Card>

        {/* Bouton de soumission */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || fields.length === 0}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le Bon de Commande'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
