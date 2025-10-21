'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/use-role';
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Scale,
  FileText
} from 'lucide-react';
import { validateProductionOrderItem } from '@/lib/supabase-service';
import type { ProductionOrderItem } from '@/lib/supabase-service';

// Debounce function pour éviter les rechargements multiples
let updateTimeout: NodeJS.Timeout | null = null;

interface ProductValidationProps {
  orderId: string;
  items: ProductionOrderItem[];
  onUpdate?: () => void;
  orderStatus?: string; // Nouveau prop pour vérifier le statut de l'OF
}

interface ValidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProductionOrderItem;
  validationType: 'production' | 'quality';
  onValidate: (status: 'approved' | 'rejected', quantityProduced?: number, notes?: string) => void;
}

const ValidationDialog = ({ isOpen, onClose, item, validationType, onValidate }: ValidationDialogProps) => {
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  const [quantityProduced, setQuantityProduced] = useState(item.quantity);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    // Validation des champs requis pour rejet qualité
    if (validationType === 'quality' && status === 'rejected') {
      if (!rejectReason.trim() || !correctiveActions.trim()) {
        return; // Ne pas procéder si les champs requis sont vides
      }
    }

    setLoading(true);
    try {
      // Construire les notes selon le type de validation et le statut
      let finalNotes = notes;
      if (validationType === 'quality' && status === 'rejected') {
        const qualityNotes = [];
        if (rejectReason.trim()) {
          qualityNotes.push(`MOTIF DE REJET: ${rejectReason.trim()}`);
        }
        if (correctiveActions.trim()) {
          qualityNotes.push(`ACTIONS CORRECTIVES: ${correctiveActions.trim()}`);
        }
        if (notes.trim()) {
          qualityNotes.push(`NOTES: ${notes.trim()}`);
        }
        finalNotes = qualityNotes.join('\n\n');
      }

      await onValidate(status, validationType === 'production' ? quantityProduced : undefined, finalNotes);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {validationType === 'production' ? 'Validation Production' : 'Validation Qualité'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium">{item.productName}</h4>
            <p className="text-sm text-muted-foreground">
              Quantité requise: {item.quantity} {item.unit}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Statut de validation</label>
            <div className="flex gap-2">
              <Button
                variant={status === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('approved')}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approuvé
              </Button>
              <Button
                variant={status === 'rejected' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setStatus('rejected')}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeté
              </Button>
            </div>
          </div>

          {validationType === 'production' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantité produite</label>
              <Input
                type="number"
                value={quantityProduced}
                onChange={(e) => setQuantityProduced(Number(e.target.value))}
                placeholder="Quantité produite"
              />
            </div>
          )}

          {/* Champs spécifiques pour validation qualité en cas de rejet */}
          {validationType === 'quality' && status === 'rejected' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-red-600">Motif de rejet *</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Décrivez précisément le motif de rejet..."
                  rows={2}
                  className="border-red-200 focus:border-red-300"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-600">Actions correctives recommandées *</label>
                <Textarea
                  value={correctiveActions}
                  onChange={(e) => setCorrectiveActions(e.target.value)}
                  placeholder="Détaillez les actions correctives à mettre en place..."
                  rows={2}
                  className="border-blue-200 focus:border-blue-300"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {validationType === 'quality' && status === 'rejected' ? 'Notes complémentaires (optionnel)' : 'Notes (optionnel)'}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Commentaires additionnels de validation..."
              rows={validationType === 'quality' && status === 'rejected' ? 2 : 3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleValidate}
              disabled={
                loading ||
                (validationType === 'quality' && status === 'rejected' && (!rejectReason.trim() || !correctiveActions.trim()))
              }
              className="flex-1"
            >
              {loading ? 'Validation...' : 'Valider'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function ProductValidation({ orderId, items, onUpdate, orderStatus }: ProductValidationProps) {
  const { role } = useRole();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<ProductionOrderItem | null>(null);
  const [validationType, setValidationType] = useState<'production' | 'quality'>('production');

  // Permissions plus souples selon le rôle ET le statut de l'OF
  const allowedProductionStatuses = ['cree', 'validation_production', 'production_validee', 'en_fabrication', 'production_terminee', 'non_conforme'];
  const allowedQualityStatuses = ['production_validee', 'validation_qualite', 'en_fabrication', 'production_terminee', 'qualite_validee', 'non_conforme'];

  const canValidateProduction = role === 'Production' && (
    !orderStatus || allowedProductionStatuses.includes(orderStatus)
  );
  const canValidateQuality = role === 'Quality' && (
    !orderStatus || allowedQualityStatuses.includes(orderStatus)
  );

  const getValidationStatus = (item: ProductionOrderItem, type: 'production' | 'quality') => {
    const status = type === 'production' ? item.productionStatus : item.qualityStatus;
    const config = {
      approved: { label: 'Approuvé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800', icon: XCircle },
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      null: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      undefined: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock }
    };
    return config[status || 'pending'];
  };

  const handleValidation = async (
    item: ProductionOrderItem,
    validationType: 'production' | 'quality',
    status: 'approved' | 'rejected',
    quantityProduced?: number,
    notes?: string
  ) => {
    try {
      console.log('🚀 Démarrage validation:', { item: item.productName, validationType, status });

      // Générer un ID utilisateur basé sur le rôle et l'heure actuelle
      const userId = `${role.toLowerCase()}-${Date.now()}`;

      const success = await validateProductionOrderItem(
        orderId,
        item.id,
        validationType,
        status,
        userId,
        quantityProduced,
        notes
      );

      console.log('✅ Résultat validation:', success);

      if (success) {
        toast({
          title: 'Validation réussie',
          description: `${item.productName} a été ${status === 'approved' ? 'approuvé' : 'rejeté'} avec succès.`
        });

        // Debounce les appels à onUpdate pour permettre les validations multiples
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(() => {
          onUpdate?.();
          updateTimeout = null;
        }, 500); // Réduit le délai pour une meilleure réactivité
      } else {
        throw new Error('La fonction a retourné false');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la validation:', error);

      // Extraire le message d'erreur le plus informatif
      let errorMessage = 'Erreur inconnue';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({
        title: 'Échec de la validation',
        description: `${item.productName}: ${errorMessage}`,
        variant: 'destructive'
      });
    }
  };

  const openValidationDialog = (item: ProductionOrderItem, type: 'production' | 'quality') => {
    setSelectedItem(item);
    setValidationType(type);
  };

  // Vérifier si l'utilisateur a les droits de validation
  const hasValidationRights = canValidateProduction || canValidateQuality;

  // Messages d'information selon le contexte
  const getInfoMessage = () => {
    if (role === 'Production' && !canValidateProduction) {
      return `Validation production non disponible pour le statut: ${orderStatus || 'inconnu'}`;
    }
    if (role === 'Quality' && !canValidateQuality) {
      return `Validation qualité non disponible pour le statut: ${orderStatus || 'inconnu'}`;
    }
    if (!hasValidationRights && (role === 'Production' || role === 'Quality')) {
      return "Vous n'avez pas les droits pour valider les produits dans le statut actuel.";
    }
    // Message d'encouragement si la validation est possible
    if (hasValidationRights) {
      if (role === 'Production') {
        return `✅ Validation production disponible (statut: ${orderStatus})`;
      }
      if (role === 'Quality') {
        return `✅ Validation qualité disponible (statut: ${orderStatus})`;
      }
    }
    return null;
  };

  const infoMessage = getInfoMessage();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Validation par produit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {infoMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">{infoMessage}</p>
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{item.productName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} {item.unit}
                  </p>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <FileText className="w-3 h-3 inline mr-1" />
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Validation Production */}
                {canValidateProduction && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Production</span>
                      <Badge
                        variant="secondary"
                        className={getValidationStatus(item, 'production').color}
                      >
                        {React.createElement(getValidationStatus(item, 'production').icon, {
                          className: 'w-3 h-3 mr-1'
                        })}
                        {getValidationStatus(item, 'production').label}
                      </Badge>
                    </div>
                    {item.quantityProduced !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        <Scale className="w-3 h-3 inline mr-1" />
                        Produit: {item.quantityProduced} {item.unit}
                      </p>
                    )}
                    {(!item.productionStatus || item.productionStatus === 'pending' || item.productionStatus === null) && (
                      <Button
                        size="sm"
                        onClick={() => openValidationDialog(item, 'production')}
                        className="w-full"
                      >
                        Valider Production
                      </Button>
                    )}
                    {item.productionStatus === 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openValidationDialog(item, 'production')}
                        className="w-full text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        Re-valider Production
                      </Button>
                    )}
                  </div>
                )}

                {/* Validation Qualité */}
                {canValidateQuality && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Qualité</span>
                      <Badge
                        variant="secondary"
                        className={getValidationStatus(item, 'quality').color}
                      >
                        {React.createElement(getValidationStatus(item, 'quality').icon, {
                          className: 'w-3 h-3 mr-1'
                        })}
                        {getValidationStatus(item, 'quality').label}
                      </Badge>
                    </div>
                    {(!item.qualityStatus || item.qualityStatus === 'pending' || item.qualityStatus === null) && (
                      <Button
                        size="sm"
                        onClick={() => openValidationDialog(item, 'quality')}
                        className="w-full"
                      >
                        Valider Qualité
                      </Button>
                    )}
                    {item.qualityStatus === 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openValidationDialog(item, 'quality')}
                        className="w-full text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        Re-valider Qualité
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Informations de validation */}
              <div className="text-xs text-muted-foreground space-y-1">
                {item.productionValidatedAt && (
                  <p>Production validée le {new Date(item.productionValidatedAt).toLocaleString()}</p>
                )}
                {item.qualityValidatedAt && (
                  <p>Qualité validée le {new Date(item.qualityValidatedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedItem && (
        <ValidationDialog
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
          validationType={validationType}
          onValidate={(status, quantityProduced, notes) =>
            handleValidation(selectedItem, validationType, status, quantityProduced, notes)
          }
        />
      )}
    </div>
  );
}