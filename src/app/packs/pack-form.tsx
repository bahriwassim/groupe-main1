'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createPack, updatePack } from '@/lib/supabase-service';
import { Pack, Product, PackItem } from '@/lib/types';
import { useNotifications } from '@/hooks/use-notifications';
import { useRole } from '@/hooks/use-role';

const packFormSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  description: z.string().optional(),
  totalPrice: z.number().min(0, 'Le prix doit être positif'),
  discount: z.number().min(0).optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional()
});

type PackFormValues = z.infer<typeof packFormSchema>;

interface PackFormProps {
  pack?: Pack | null;
  products: Product[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function PackForm({ pack, products, onSuccess, onCancel }: PackFormProps) {
  const { addNotification } = useNotifications();
  const { role } = useRole();
  const [items, setItems] = useState<PackItem[]>(pack?.items || []);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<PackFormValues>({
    resolver: zodResolver(packFormSchema),
    defaultValues: {
      name: pack?.name || '',
      description: pack?.description || '',
      totalPrice: pack?.totalPrice || 0,
      discount: pack?.discount || 0,
      imageUrl: pack?.imageUrl || '',
      isActive: pack?.isActive !== undefined ? pack.isActive : true
    }
  });

  const totalPrice = watch('totalPrice');

  // Calculer le prix total basé sur les produits
  const calculatedTotal = items.reduce((total, item) => {
    const product = products.find(p => p.id === item.productId);
    return total + (product?.price || 0) * item.quantity;
  }, 0);

  function handleAddItem() {
    if (!selectedProductId) {
      addNotification({
        type: 'warning',
        title: 'Sélection requise',
        message: 'Veuillez sélectionner un produit'
      });
      return;
    }

    // Vérifier si le produit existe déjà
    const existingIndex = items.findIndex(item => item.productId === selectedProductId);
    if (existingIndex >= 0) {
      // Mettre à jour la quantité
      const newItems = [...items];
      newItems[existingIndex].quantity += selectedQuantity;
      setItems(newItems);
    } else {
      // Ajouter un nouveau produit
      setItems([...items, {
        productId: selectedProductId,
        quantity: selectedQuantity
      }]);
    }

    // Réinitialiser la sélection
    setSelectedProductId('');
    setSelectedQuantity(1);
  }

  function handleRemoveItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function handleUpdateQuantity(index: number, quantity: number) {
    if (quantity < 1) return;
    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  }

  function handleAutoCalculatePrice() {
    setValue('totalPrice', calculatedTotal);
    addNotification({
      type: 'info',
      title: 'Prix calculé',
      message: `Prix total calculé: ${calculatedTotal.toFixed(2)} DT`
    });
  }

  async function onSubmit(data: PackFormValues) {
    if (items.length === 0) {
      addNotification({
        type: 'warning',
        title: 'Produits requis',
        message: 'Veuillez ajouter au moins un produit au pack'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const packData = {
        name: data.name,
        description: data.description,
        items,
        totalPrice: data.totalPrice,
        discount: data.discount,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
        createdBy: `${role} User`
      };

      let result;
      if (pack) {
        result = await updatePack(pack.id, packData);
      } else {
        result = await createPack(packData);
      }

      if (result) {
        addNotification({
          type: 'success',
          title: pack ? 'Pack modifié' : 'Pack créé',
          message: `Le pack "${data.name}" a été ${pack ? 'modifié' : 'créé'} avec succès`
        });
        onSuccess();
      } else {
        throw new Error('Échec de l\'opération');
      }
    } catch (error) {
      console.error('Erreur soumission pack:', error);
      addNotification({
        type: 'error',
        title: 'Erreur',
        message: `Impossible de ${pack ? 'modifier' : 'créer'} le pack`
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || productId;
  };

  const getProductPrice = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.price || 0;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informations de base */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nom du Pack *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="ex: Pack Petit Déjeuner"
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Décrivez le pack..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="imageUrl">URL de l'image</Label>
          <Input
            id="imageUrl"
            {...register('imageUrl')}
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Sélection des produits */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Produits du Pack ({items.length})</Label>
            {items.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoCalculatePrice}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calculer Prix Auto
              </Button>
            )}
          </div>

          {/* Liste des produits ajoutés */}
          {items.length > 0 && (
            <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 bg-background p-2 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{getProductName(item.productId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {getProductPrice(item.productId).toFixed(2)} DT × {item.quantity} = {' '}
                      {(getProductPrice(item.productId) * item.quantity).toFixed(2)} DT
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <p className="text-sm font-medium">
                  Total calculé: <span className="text-primary">{calculatedTotal.toFixed(2)} DT</span>
                </p>
              </div>
            </div>
          )}

          {/* Ajouter un produit */}
          <div className="flex gap-2">
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {product.price.toFixed(2)} DT
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              value={selectedQuantity}
              onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
              className="w-20"
              placeholder="Qté"
            />
            <Button
              type="button"
              onClick={handleAddItem}
              disabled={!selectedProductId}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prix et remise */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="totalPrice">Prix Total du Pack (DT) *</Label>
          <Input
            id="totalPrice"
            type="number"
            step="0.01"
            {...register('totalPrice', { valueAsNumber: true })}
          />
          {errors.totalPrice && (
            <p className="text-sm text-destructive mt-1">{errors.totalPrice.message}</p>
          )}
          {calculatedTotal > 0 && totalPrice < calculatedTotal && (
            <p className="text-xs text-green-600 mt-1">
              Économie: {(calculatedTotal - totalPrice).toFixed(2)} DT
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="discount">Remise (DT)</Label>
          <Input
            id="discount"
            type="number"
            step="0.01"
            {...register('discount', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Statut actif */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          {...register('isActive')}
          className="rounded"
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Pack actif (disponible à la vente)
        </Label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Enregistrement...' : pack ? 'Modifier le Pack' : 'Créer le Pack'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
