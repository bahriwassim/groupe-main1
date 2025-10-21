'use client'

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Factory, Shield, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/use-role';
import type { ProductionValidation, ValidationStatus, ValidationType, ValidationPriority } from '@/lib/types';
import {
  getProductionValidations,
  createProductionValidation,
  updateProductionValidation,
  updateProductionOrderStatus
} from '@/lib/supabase-service';

interface ProductionValidationWorkflowProps {
  productionOrderId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

export function ProductionValidationWorkflow({
  productionOrderId,
  currentStatus,
  onStatusChange
}: ProductionValidationWorkflowProps) {
  const [validations, setValidations] = useState<ProductionValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [currentValidationType, setCurrentValidationType] = useState<ValidationType>('production');
  const { toast } = useToast();
  const { role } = useRole();

  // Form state
  const [validationForm, setValidationForm] = useState({
    status: 'en_attente' as ValidationStatus,
    notes: '',
    nonConformityReason: '',
    correctiveAction: '',
    priority: 'normal' as ValidationPriority,
    confirmProductionOrder: false,
    confirmCommand: false
  });

  useEffect(() => {
    loadValidations();
  }, [productionOrderId]);

  const loadValidations = async () => {
    setLoading(true);
    try {
      const validationsData = await getProductionValidations(productionOrderId);
      setValidations(validationsData);
    } catch (error) {
      console.error('Erreur lors du chargement des validations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getValidationIcon = (type: ValidationType) => {
    switch (type) {
      case 'production':
        return <Factory className="h-5 w-5" />;
      case 'qualite':
        return <Shield className="h-5 w-5" />;
      case 'quantite':
        return <Scale className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getValidationLabel = (type: ValidationType) => {
    switch (type) {
      case 'production':
        return 'Validation Production';
      case 'qualite':
        return 'Validation Qualité';
      case 'quantite':
        return 'Validation Quantité';
      default:
        return 'Validation';
    }
  };

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'valide':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'non_conforme':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'en_attente':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ValidationStatus) => {
    switch (status) {
      case 'valide':
        return 'bg-green-100 text-green-800';
      case 'non_conforme':
        return 'bg-red-100 text-red-800';
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: ValidationPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canUserValidateType = (type: ValidationType): boolean => {
    switch (type) {
      case 'production':
        return role === 'Production';
      case 'qualite':
      case 'quantite':
        return role === 'Quality';
      default:
        return false;
    }
  };

  const getNextValidationType = (): ValidationType | null => {
    const productionValidation = validations.find(v => v.validationType === 'production');
    const qualiteValidation = validations.find(v => v.validationType === 'qualite');
    const quantiteValidation = validations.find(v => v.validationType === 'quantite');

    // Workflow: Production → Qualité → Quantité
    if (!productionValidation || productionValidation.status !== 'valide') {
      return 'production';
    }
    if (!qualiteValidation || qualiteValidation.status !== 'valide') {
      return 'qualite';
    }
    if (!quantiteValidation || quantiteValidation.status !== 'valide') {
      return 'quantite';
    }

    return null; // Toutes les validations sont terminées
  };

  const openValidationDialog = (type: ValidationType) => {
    setCurrentValidationType(type);
    setValidationForm({
      status: 'en_attente',
      notes: '',
      nonConformityReason: '',
      correctiveAction: '',
      priority: 'normal',
      confirmProductionOrder: false,
      confirmCommand: false
    });
    setIsValidationDialogOpen(true);
  };

  const handleValidationSubmit = async () => {
    try {
      // Vérifier les confirmations pour la validation qualité
      if (currentValidationType === 'qualite' && validationForm.status === 'valide') {
        if (!validationForm.confirmProductionOrder || !validationForm.confirmCommand) {
          toast({
            title: "Confirmations manquantes",
            description: "Veuillez confirmer l'ordre de fabrication et la commande pour valider la qualité.",
            variant: "destructive"
          });
          return;
        }
      }

      const existingValidation = validations.find(v => v.validationType === currentValidationType);

      if (existingValidation) {
        // Mettre à jour la validation existante
        await updateProductionValidation(existingValidation.id, {
          status: validationForm.status,
          notes: validationForm.notes,
          nonConformityReason: validationForm.status === 'non_conforme' ? validationForm.nonConformityReason : undefined,
          correctiveAction: validationForm.status === 'non_conforme' ? validationForm.correctiveAction : undefined,
          priority: validationForm.status === 'non_conforme' ? validationForm.priority : undefined,
        });
      } else {
        // Créer une nouvelle validation
        await createProductionValidation({
          productionOrderId,
          validationType: currentValidationType,
          status: validationForm.status,
          notes: validationForm.notes,
          nonConformityReason: validationForm.status === 'non_conforme' ? validationForm.nonConformityReason : undefined,
          correctiveAction: validationForm.status === 'non_conforme' ? validationForm.correctiveAction : undefined,
          priority: validationForm.status === 'non_conforme' ? validationForm.priority : undefined,
        });
      }

      await loadValidations();
      setIsValidationDialogOpen(false);

      toast({
        title: "Validation enregistrée",
        description: `Validation ${getValidationLabel(currentValidationType).toLowerCase()} mise à jour`,
      });

      // Déclencher une mise à jour du statut OF selon workflow hygiène avant production
      const nextType = getNextValidationType();
      if (validationForm.status === 'non_conforme') {
        await updateProductionOrderStatus(productionOrderId, 'non_conforme');
        onStatusChange && onStatusChange('non_conforme');
      } else if (currentValidationType === 'production' && validationForm.status === 'valide') {
        // Validation production terminée, rester en attente pour les étapes suivantes
        await updateProductionOrderStatus(productionOrderId, 'production_validee');
        onStatusChange && onStatusChange('production_validee');
      } else if (currentValidationType === 'qualite' && validationForm.status === 'valide') {
        // Validation qualité terminée, vérifier si quantité est aussi validée
        const quantiteValidation = validations.find(v => v.validationType === 'quantite');
        if (quantiteValidation && quantiteValidation.status === 'valide') {
          // Toutes validations hygiène (qualité+quantité) terminées
          await updateProductionOrderStatus(productionOrderId, 'qualite_validee');
          onStatusChange && onStatusChange('qualite_validee');
        } else {
          // En cours de validation hygiène
          await updateProductionOrderStatus(productionOrderId, 'validation_qualite');
          onStatusChange && onStatusChange('validation_qualite');
        }
      } else if (currentValidationType === 'quantite' && validationForm.status === 'valide') {
        // Validation quantité terminée, vérifier si qualité est aussi validée
        const qualiteValidation = validations.find(v => v.validationType === 'qualite');
        if (qualiteValidation && qualiteValidation.status === 'valide') {
          // Toutes validations hygiène (qualité+quantité) terminées
          await updateProductionOrderStatus(productionOrderId, 'qualite_validee');
          onStatusChange && onStatusChange('qualite_validee');
        } else {
          // En cours de validation hygiène
          await updateProductionOrderStatus(productionOrderId, 'validation_qualite');
          onStatusChange && onStatusChange('validation_qualite');
        }
      } else {
        // En cours de validation hygiène
        await updateProductionOrderStatus(productionOrderId, 'validation_qualite');
        onStatusChange && onStatusChange('validation_qualite');
      }

    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la validation",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow de Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Workflow de Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statut actuel */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900">
              Statut actuel: <Badge variant="secondary">{currentStatus}</Badge>
            </div>
          </div>

          {/* Étapes de validation */}
          <div className="space-y-3">
            {(['production', 'qualite', 'quantite'] as ValidationType[]).map((type, index) => {
              const validation = validations.find(v => v.validationType === type);
              const isNext = getNextValidationType() === type;

              return (
                <div key={type} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    {getValidationIcon(type)}
                    <span className="font-medium">{getValidationLabel(type)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {validation ? (
                      <>
                        {getStatusIcon(validation.status)}
                        <Badge className={getStatusColor(validation.status)}>
                          {validation.status === 'valide' ? 'Validé' :
                           validation.status === 'non_conforme' ? 'Non conforme' :
                           'En attente'}
                        </Badge>
                        {validation.status === 'non_conforme' && validation.priority && (
                          <Badge className={getPriorityColor(validation.priority)}>
                            {validation.priority}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-gray-400" />
                        <Badge variant="outline">Non commencé</Badge>
                      </>
                    )}

                    {isNext && canUserValidateType(type) && (
                      <Button
                        size="sm"
                        onClick={() => openValidationDialog(type)}
                        className="ml-2"
                      >
                        {validation ? 'Modifier' : 'Valider'}
                      </Button>
                    )}
                    {isNext && !canUserValidateType(type) && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {type === 'production' ? 'Service Production requis' : 'Service Qualité requis'}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alertes pour non-conformités */}
          {validations.some(v => v.status === 'non_conforme') && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                <AlertTriangle className="h-5 w-5" />
                Non-conformités détectées
              </div>
              {validations
                .filter(v => v.status === 'non_conforme')
                .map(validation => (
                  <div key={validation.id} className="text-sm text-red-700 ml-7">
                    <strong>{getValidationLabel(validation.validationType)}:</strong> {validation.nonConformityReason}
                    {validation.correctiveAction && (
                      <div className="mt-1">
                        <strong>Action corrective:</strong> {validation.correctiveAction}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de validation */}
      <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getValidationIcon(currentValidationType)}
              {getValidationLabel(currentValidationType)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="status">Résultat de la validation</Label>
              <Select
                value={validationForm.status}
                onValueChange={(value: ValidationStatus) => setValidationForm(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="valide">Validé</SelectItem>
                  <SelectItem value="non_conforme">Non conforme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes de validation</Label>
              <Textarea
                id="notes"
                value={validationForm.notes}
                onChange={(e) => setValidationForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Commentaires sur la validation..."
                className="mt-1"
              />
            </div>

            {validationForm.status === 'non_conforme' && (
              <>
                <div>
                  <Label htmlFor="nonConformityReason">Motif de non-conformité</Label>
                  <Textarea
                    id="nonConformityReason"
                    value={validationForm.nonConformityReason}
                    onChange={(e) => setValidationForm(prev => ({ ...prev, nonConformityReason: e.target.value }))}
                    placeholder="Décrivez la non-conformité..."
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="correctiveAction">Action corrective</Label>
                  <Textarea
                    id="correctiveAction"
                    value={validationForm.correctiveAction}
                    onChange={(e) => setValidationForm(prev => ({ ...prev, correctiveAction: e.target.value }))}
                    placeholder="Action à prendre pour corriger..."
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priorité</Label>
                  <Select
                    value={validationForm.priority}
                    onValueChange={(value: ValidationPriority) => setValidationForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="normal">Normale</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Champs de confirmation pour validation qualité */}
            {currentValidationType === 'qualite' && validationForm.status === 'valide' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">Confirmations requises</h4>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirmProductionOrder"
                    checked={validationForm.confirmProductionOrder}
                    onCheckedChange={(checked) =>
                      setValidationForm(prev => ({ ...prev, confirmProductionOrder: Boolean(checked) }))
                    }
                  />
                  <Label htmlFor="confirmProductionOrder" className="text-sm">
                    Confirmer l'ordre de fabrication
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirmCommand"
                    checked={validationForm.confirmCommand}
                    onCheckedChange={(checked) =>
                      setValidationForm(prev => ({ ...prev, confirmCommand: Boolean(checked) }))
                    }
                  />
                  <Label htmlFor="confirmCommand" className="text-sm">
                    Confirmer commande
                  </Label>
                </div>

                {(!validationForm.confirmProductionOrder || !validationForm.confirmCommand) && (
                  <p className="text-xs text-blue-700">
                    ⚠️ Veuillez confirmer les deux éléments pour valider la qualité
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsValidationDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleValidationSubmit}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}