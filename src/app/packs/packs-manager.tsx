'use client';

import { useState, useEffect } from 'react';
import { Plus, Package, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getPacks, deletePack, togglePackActive, getProducts } from '@/lib/supabase-service';
import { Pack, Product } from '@/lib/types';
import { PackForm } from './pack-form';
import { useRole } from '@/hooks/use-role';
import { useNotifications } from '@/hooks/use-notifications';
import { Preloader } from '@/components/preloader';

export function PacksManager() {
  const { role } = useRole();
  const { addNotification } = useNotifications();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [packsData, productsData] = await Promise.all([
        getPacks(),
        getProducts()
      ]);
      setPacks(packsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      addNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les données'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePack(packId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce pack ?')) {
      return;
    }

    const success = await deletePack(packId);
    if (success) {
      addNotification({
        type: 'success',
        title: 'Pack supprimé',
        message: 'Le pack a été supprimé avec succès'
      });
      await loadData();
    } else {
      addNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de supprimer le pack'
      });
    }
  }

  async function handleToggleActive(packId: string, currentActive: boolean) {
    const success = await togglePackActive(packId, !currentActive);
    if (success) {
      addNotification({
        type: 'success',
        title: currentActive ? 'Pack désactivé' : 'Pack activé',
        message: `Le pack a été ${currentActive ? 'désactivé' : 'activé'} avec succès`
      });
      await loadData();
    } else {
      addNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de modifier le statut du pack'
      });
    }
  }

  function handleEditPack(pack: Pack) {
    setSelectedPack(pack);
    setIsDialogOpen(true);
  }

  function handleCreateNew() {
    setSelectedPack(null);
    setIsDialogOpen(true);
  }

  function getProductName(productId: string): string {
    const product = products.find(p => p.id === productId);
    return product?.name || productId;
  }

  function calculateActualTotal(pack: Pack): number {
    return pack.items.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  }

  if (role !== 'Admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accès Restreint</CardTitle>
          <CardDescription>
            Seuls les administrateurs peuvent gérer les packs.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return <Preloader message="Chargement des packs..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {packs.length} pack{packs.length !== 1 ? 's' : ''} au total
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un Pack
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedPack ? 'Modifier le Pack' : 'Créer un Nouveau Pack'}
              </DialogTitle>
              <DialogDescription>
                {selectedPack
                  ? 'Modifiez les détails du pack et sa liste de produits'
                  : 'Créez un nouveau pack en sélectionnant des produits et en définissant un prix'}
              </DialogDescription>
            </DialogHeader>
            <PackForm
              pack={selectedPack}
              products={products}
              onSuccess={async () => {
                setIsDialogOpen(false);
                setSelectedPack(null);
                await loadData();
              }}
              onCancel={() => {
                setIsDialogOpen(false);
                setSelectedPack(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement des packs...</p>
        </div>
      ) : packs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Aucun Pack
            </CardTitle>
            <CardDescription>
              Commencez par créer votre premier pack de produits.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => {
            const actualTotal = calculateActualTotal(pack);
            const savings = actualTotal - pack.totalPrice;
            const savingsPercent = actualTotal > 0 ? (savings / actualTotal) * 100 : 0;

            return (
              <Card key={pack.id} className={!pack.isActive ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {pack.name}
                        {!pack.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactif
                          </Badge>
                        )}
                      </CardTitle>
                      {pack.description && (
                        <CardDescription className="mt-2">
                          {pack.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Produits dans le pack */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Produits ({pack.items.length}):</p>
                    <div className="space-y-1">
                      {pack.items.map((item, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground flex justify-between">
                          <span>• {getProductName(item.productId)}</span>
                          <span className="font-medium">×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prix */}
                  <div className="border-t pt-3 space-y-1">
                    {savings > 0 && (
                      <div className="text-sm text-muted-foreground line-through">
                        Prix normal: {actualTotal.toFixed(2)} DT
                      </div>
                    )}
                    <div className="text-lg font-bold text-primary">
                      {pack.totalPrice.toFixed(2)} DT
                    </div>
                    {savings > 0 && (
                      <div className="text-sm text-green-600 font-medium">
                        Économie: {savings.toFixed(2)} DT ({savingsPercent.toFixed(0)}%)
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPack(pack)}
                      className="flex-1"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(pack.id, pack.isActive)}
                    >
                      {pack.isActive ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePack(pack.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>

                  {/* Métadonnées */}
                  {pack.createdBy && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      Créé par: {pack.createdBy}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
