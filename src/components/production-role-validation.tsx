'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Factory,
  CheckCircle,
  X,
  AlertCircle,
  Clock,
  Shield,
  FileCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateProductionOrderStatus, type ProductionOrder } from '@/lib/supabase-service';

interface ProductionRoleValidationProps {
  order: ProductionOrder;
  userRole: string;
  onStatusChange: (newStatus: string) => void;
}

export function ProductionRoleValidation({
  order,
  userRole,
  onStatusChange
}: ProductionRoleValidationProps) {
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationType, setValidationType] = useState<'approve' | 'reject'>('approve');
  const [validationForm, setValidationForm] = useState({
    notes: '',
    confirmPreparation: false,
    confirmQuality: false,
    confirmQuantity: false,
    rejectReason: ''
  });

  const { toast } = useToast();

  const canStartProduction = () => {
    return userRole === 'Production' && order.status === 'cree';
  };

  const canFinishProduction = () => {
    return userRole === 'Production' && order.status === 'en_fabrication';
  };

  const canValidateQuality = () => {
    return (userRole === 'Quality' || userRole === 'Hygiene') &&
           order.status === 'production_terminee';
  };

  const resetForm = () => {
    setValidationForm({
      notes: '',
      confirmPreparation: false,
      confirmQuality: false,
      confirmQuantity: false,
      rejectReason: ''
    });
  };

  const openValidationDialog = (type: 'approve' | 'reject') => {
    setValidationType(type);
    resetForm();
    setIsValidationDialogOpen(true);
  };

  const handleValidationSubmit = async () => {
    try {
      let newStatus: string;
      let successMessage: string;

      if (validationType === 'reject') {
        newStatus = 'non_conforme';
        successMessage = 'Ordre rejeté et marqué comme non conforme';
      } else {
        // Logique d'approbation selon le rôle et le statut
        if (userRole === 'Production' && order.status === 'cree') {
          // Commencer la production
          if (!validationForm.confirmPreparation) {
            toast({
              title: "Confirmation manquante",
              description: "Veuillez confirmer le début de production.",
              variant: "destructive"
            });
            return;
          }

          newStatus = 'en_fabrication';
          successMessage = 'Production commencée avec succès.';
        } else if (userRole === 'Production' && order.status === 'en_fabrication') {
          // Terminer la production
          if (!validationForm.confirmPreparation) {
            toast({
              title: "Confirmation manquante",
              description: "Veuillez confirmer la fin de production.",
              variant: "destructive"
            });
            return;
          }

          newStatus = 'production_terminee';
          successMessage = 'Production terminée. L\'ordre passe en validation qualité.';
        } else if ((userRole === 'Quality' || userRole === 'Hygiene') &&
                   order.status === 'production_terminee') {
          // Vérifications pour la qualité/hygiène
          if (!validationForm.confirmQuality || !validationForm.confirmQuantity) {
            toast({
              title: "Confirmations manquantes",
              description: "Veuillez confirmer la qualité et la quantité avant validation.",
              variant: "destructive"
            });
            return;
          }

          newStatus = 'qualite_validee';
          successMessage = 'Qualité validée. L\'ordre peut être finalisé.';
        } else {
          toast({
            title: "Erreur de validation",
            description: "Validation non autorisée pour ce rôle ou ce statut.",
            variant: "destructive"
          });
          return;
        }
      }

      const success = await updateProductionOrderStatus(
        order.id,
        newStatus as any,
        validationForm.notes || validationForm.rejectReason
      );

      if (success) {
        onStatusChange(newStatus);
        setIsValidationDialogOpen(false);
        resetForm();

        toast({
          title: "Validation enregistrée",
          description: successMessage
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le statut de l'ordre.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la validation.",
        variant: "destructive"
      });
    }
  };

  const getValidationTitle = () => {
    if (userRole === 'Production') return 'Validation Production';
    if (userRole === 'Quality' || userRole === 'Hygiene') return 'Validation Qualité & Hygiène';
    return 'Validation';
  };

  const getValidationIcon = () => {
    if (userRole === 'Production') return <Factory className="h-5 w-5" />;
    if (userRole === 'Quality' || userRole === 'Hygiene') return <Shield className="h-5 w-5" />;
    return <FileCheck className="h-5 w-5" />;
  };

  // Si l'utilisateur ne peut pas interagir avec cet ordre, ne pas afficher le composant
  if (!canStartProduction() && !canFinishProduction() && !canValidateQuality()) {
    return null;
  }

  return (
    <>
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getValidationIcon()}
            {getValidationTitle()}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Statut actuel */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Statut actuel:</span>
                <Badge variant="outline" className="bg-white">
                  <Clock className="h-3 w-3 mr-1" />
                  {order.status === 'cree' ? 'Prêt à commencer production' :
                   order.status === 'en_fabrication' ? 'Production en cours' :
                   order.status === 'production_terminee' ? 'En attente validation qualité' :
                   order.status}
                </Badge>
              </div>
            </div>

            {/* Informations sur l'ordre */}
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Ordre:</span> {order.orderNumber}
              </div>
              <div className="text-sm">
                <span className="font-medium">Laboratoire:</span> {order.laboratory}
              </div>
              <div className="text-sm">
                <span className="font-medium">Priorité:</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {order.priority}
                </Badge>
              </div>
              <div className="text-sm">
                <span className="font-medium">Produits:</span> {order.items.length} article(s)
              </div>
            </div>

            {/* Actions selon le rôle et statut */}
            <div className="flex gap-2 pt-4">
              {canStartProduction() && (
                <Button
                  className="flex-1"
                  onClick={() => openValidationDialog('approve')}
                >
                  <Factory className="h-4 w-4 mr-2" />
                  Commencer Production
                </Button>
              )}

              {canFinishProduction() && (
                <Button
                  className="flex-1"
                  onClick={() => openValidationDialog('approve')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Terminer Production
                </Button>
              )}

              {canValidateQuality() && (
                <Button
                  className="flex-1"
                  onClick={() => openValidationDialog('approve')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider Qualité
                </Button>
              )}

              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => openValidationDialog('reject')}
              >
                <X className="h-4 w-4 mr-2" />
                Rejeter
              </Button>
            </div>

            {/* Instruction pour l'utilisateur */}
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <AlertCircle className="h-4 w-4 inline mr-1 text-yellow-600" />
              {canStartProduction() ? 'Cliquez sur "Commencer Production" pour démarrer la fabrication.' :
               canFinishProduction() ? 'Cliquez sur "Terminer Production" une fois la fabrication terminée.' :
               canValidateQuality() ? 'Validez la qualité et la quantité une fois la production terminée.' :
               'Action en cours...'
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de validation */}
      <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getValidationIcon()}
              {validationType === 'approve' ?
                (canStartProduction() ? 'Commencer la production' :
                 canFinishProduction() ? 'Terminer la production' :
                 canValidateQuality() ? 'Valider la qualité' : 'Valider l\'ordre') :
                'Rejeter l\'ordre'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Ordre: {order.orderNumber} - {order.laboratory}
            </div>

            {validationType === 'approve' ? (
              <>
                {/* Confirmations pour les actions Production */}
                {userRole === 'Production' && (
                  <div className="space-y-3 p-3 bg-blue-50 rounded">
                    <h4 className="font-medium text-blue-900">
                      {canStartProduction() ? 'Confirmation Début Production' :
                       canFinishProduction() ? 'Confirmation Fin Production' : 'Confirmations Production'}
                    </h4>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="confirmPreparation"
                        checked={validationForm.confirmPreparation}
                        onCheckedChange={(checked) =>
                          setValidationForm(prev => ({ ...prev, confirmPreparation: Boolean(checked) }))
                        }
                      />
                      <Label htmlFor="confirmPreparation" className="text-sm">
                        {canStartProduction() ? 'Confirmer le début de la production' :
                         canFinishProduction() ? 'Confirmer la fin de la production' :
                         'Confirmer la préparation de production'}
                      </Label>
                    </div>
                  </div>
                )}

                {/* Confirmations pour validation qualité */}
                {(userRole === 'Quality' || userRole === 'Hygiene') && (
                  <div className="space-y-3 p-3 bg-green-50 rounded">
                    <h4 className="font-medium text-green-900">Confirmations Qualité & Hygiène</h4>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="confirmQuality"
                        checked={validationForm.confirmQuality}
                        onCheckedChange={(checked) =>
                          setValidationForm(prev => ({ ...prev, confirmQuality: Boolean(checked) }))
                        }
                      />
                      <Label htmlFor="confirmQuality" className="text-sm">
                        Confirmer la validation qualité
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="confirmQuantity"
                        checked={validationForm.confirmQuantity}
                        onCheckedChange={(checked) =>
                          setValidationForm(prev => ({ ...prev, confirmQuantity: Boolean(checked) }))
                        }
                      />
                      <Label htmlFor="confirmQuantity" className="text-sm">
                        Confirmer la validation quantité
                      </Label>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notes de validation (optionnel)</Label>
                  <Textarea
                    id="notes"
                    value={validationForm.notes}
                    onChange={(e) => setValidationForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Commentaires additionnels..."
                    className="mt-2"
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="rejectReason">Raison du rejet *</Label>
                <Textarea
                  id="rejectReason"
                  value={validationForm.rejectReason}
                  onChange={(e) => setValidationForm(prev => ({ ...prev, rejectReason: e.target.value }))}
                  placeholder="Expliquez pourquoi cet ordre est rejeté..."
                  className="mt-2"
                  required
                />
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <AlertCircle className="h-4 w-4 inline mr-1 text-red-600" />
                  L'ordre sera marqué comme non conforme et devra être corrigé.
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsValidationDialogOpen(false)}
            >
              Annuler
            </Button>

            <Button
              onClick={handleValidationSubmit}
              variant={validationType === 'approve' ? 'default' : 'destructive'}
              disabled={
                validationType === 'reject' ? !validationForm.rejectReason.trim() :
                userRole === 'Production' ? !validationForm.confirmPreparation :
                (userRole === 'Quality' || userRole === 'Hygiene') ?
                  (!validationForm.confirmQuality || !validationForm.confirmQuantity) : false
              }
            >
              {validationType === 'approve' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Rejeter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}