'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield,
  CheckCircle,
  Clock,
  Eye,
  FileCheck,
  AlertCircle,
  Scale,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateProductionOrderStatus, createNonConformity, type ProductionOrder } from '@/lib/supabase-service';

interface QualityWorkflowProps {
  order: ProductionOrder;
  userRole: string;
  onStatusChange: (newStatus: string) => void;
}

export function QualityWorkflow({
  order,
  userRole,
  onStatusChange
}: QualityWorkflowProps) {
  const [loading, setLoading] = useState(false);
  const [isNonConformityDialogOpen, setIsNonConformityDialogOpen] = useState(false);
  const [nonConformityReason, setNonConformityReason] = useState('');
  const [correctiveSolution, setCorrectiveSolution] = useState('');
  const [selectedDefectType, setSelectedDefectType] = useState('');
  const { toast } = useToast();

  // Workflow étapes pour le rôle Quality
  const qualitySteps = [
    {
      key: 'validation_qualite',
      label: 'Contrôle qualité',
      description: 'Vérification des spécifications qualité',
      icon: Shield,
      color: 'bg-yellow-100 text-yellow-800',
      completed: ['qualite_validee', 'en_fabrication', 'production_terminee', 'termine'].includes(order.status),
      current: order.status === 'validation_qualite'
    },
    {
      key: 'product_validation',
      label: 'Validation par produit',
      description: 'Contrôle individuel de chaque produit',
      icon: FileCheck,
      color: 'bg-blue-100 text-blue-800',
      completed: getAllProductsValidated(),
      current: order.status === 'validation_qualite' && !getAllProductsValidated()
    },
    {
      key: 'qualite_validee',
      label: 'Qualité validée',
      description: 'Tous les contrôles qualité passés',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      completed: ['en_fabrication', 'production_terminee', 'termine'].includes(order.status),
      current: order.status === 'qualite_validee'
    }
  ];

  function getAllProductsValidated(): boolean {
    return order.items.every(item => item.qualityStatus === 'approved');
  }

  const getQualityProgress = () => {
    const approvedItems = order.items.filter(item => item.qualityStatus === 'approved').length;
    const totalItems = order.items.length;

    if (totalItems === 0) return 0;

    const productProgress = (approvedItems / totalItems) * 100;

    // Progression générale basée sur le statut
    if (order.status === 'qualite_validee') return 100;
    if (order.status === 'validation_qualite') return Math.min(productProgress, 90);

    return 0;
  };

  const canPerformQualityAction = (action: string) => {
    if (userRole !== 'Quality') return false;

    switch (action) {
      case 'approve_quality':
        return order.status === 'validation_qualite' && getAllProductsValidated();
      case 'reject_quality':
        return order.status === 'validation_qualite';
      default:
        return false;
    }
  };

  const handleQualityStatusUpdate = async (newStatus: string, actionLabel: string) => {
    if (newStatus === 'non_conforme') {
      // Ouvrir le dialog de non-conformité
      setIsNonConformityDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const success = await updateProductionOrderStatus(order.id, newStatus as any);
      if (success) {
        toast({
          title: 'Contrôle qualité mis à jour',
          description: `${actionLabel} effectué avec succès`
        });
        onStatusChange(newStatus);
      } else {
        throw new Error('Échec de la mise à jour');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: `Impossible de ${actionLabel.toLowerCase()}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNonConformitySubmit = async () => {
    if (!selectedDefectType || !nonConformityReason || !correctiveSolution) {
      toast({
        title: 'Informations manquantes',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Créer l'enregistrement de non-conformité en base
      const nonConformity = await createNonConformity({
        productionOrderId: order.id,
        defectType: selectedDefectType as any,
        reason: nonConformityReason,
        correctiveSolution: correctiveSolution,
        reportedBy: userRole // Ou l'ID de l'utilisateur si disponible
      });

      if (nonConformity) {
        // Le trigger en DB met automatiquement l'ordre en statut 'non_conforme' et priorité 'urgent'
        toast({
          title: 'Non-conformité enregistrée',
          description: 'L\'ordre a été marqué non-conforme et mis en priorité urgente'
        });

        onStatusChange('non_conforme');
        setIsNonConformityDialogOpen(false);

        // Réinitialiser les champs
        setSelectedDefectType('');
        setNonConformityReason('');
        setCorrectiveSolution('');
      } else {
        throw new Error('Échec de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur non-conformité:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la non-conformité',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== 'Quality') {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Workflow Qualité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Progress qualité */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progression Qualité</span>
            <span>{Math.round(getQualityProgress())}%</span>
          </div>
          <Progress value={getQualityProgress()} className="h-2" />
        </div>

        <Separator />

        {/* Étapes du workflow qualité */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">CONTRÔLES QUALITÉ</h3>

          {qualitySteps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex items-start gap-3">
                {/* Icône et ligne de connexion */}
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full ${
                    step.completed
                      ? 'bg-green-100 text-green-600'
                      : step.current
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    <StepIcon className="w-4 h-4" />
                  </div>
                  {index < qualitySteps.length - 1 && (
                    <div className={`w-0.5 h-8 mt-2 ${
                      step.completed ? 'bg-green-200' : 'bg-gray-200'
                    }`} />
                  )}
                </div>

                {/* Contenu de l'étape */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{step.label}</h4>
                    {step.completed && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {step.current && (
                      <Badge variant="secondary" className="text-xs">
                        En cours
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Validation par produit - résumé */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">VALIDATION PAR PRODUIT</h3>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {order.items.filter(item => item.qualityStatus === 'approved').length}
              </div>
              <div className="text-xs text-muted-foreground">Approuvés</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">
                {order.items.filter(item => item.qualityStatus === 'rejected').length}
              </div>
              <div className="text-xs text-muted-foreground">Rejetés</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-yellow-600">
                {order.items.filter(item => !item.qualityStatus || item.qualityStatus === 'pending').length}
              </div>
              <div className="text-xs text-muted-foreground">En attente</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions qualité */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">ACTIONS QUALITÉ</h3>

          {order.status === 'validation_qualite' && !getAllProductsValidated() && (
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                Veuillez valider tous les produits individuellement avant d'approuver l'ordre complet.
                Utilisez la section "Validation par produit" ci-dessus.
              </AlertDescription>
            </Alert>
          )}

          {order.status === 'validation_qualite' && getAllProductsValidated() && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Tous les produits ont été validés. Vous pouvez maintenant approuver l'ordre complet.
              </AlertDescription>
            </Alert>
          )}

          {order.status === 'qualite_validee' && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Contrôle qualité terminé. L'ordre peut maintenant passer en fabrication.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 flex-wrap">
            {canPerformQualityAction('approve_quality') && (
              <Button
                onClick={() => handleQualityStatusUpdate('qualite_validee', 'Validation qualité')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approuver la qualité
              </Button>
            )}

            {canPerformQualityAction('reject_quality') && (
              <Button
                onClick={() => handleQualityStatusUpdate('non_conforme', 'Rejet qualité')}
                disabled={loading}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Rejeter pour non-conformité
              </Button>
            )}
          </div>
        </div>

        {/* Informations BC liés */}
        <Separator />

        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground">BONS DE COMMANDE LIÉS</h3>
          <p className="text-sm text-muted-foreground">
            {order.bcOrigins?.length || 0} commande(s) liée(s) -
            Consultez la section "Bons de Commande liés" pour voir les détails sans prix.
          </p>
        </div>
      </CardContent>
    </Card>

    {/* Dialog de non-conformité */}
    <Dialog open={isNonConformityDialogOpen} onOpenChange={setIsNonConformityDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Déclaration de Non-Conformité
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-800">
              <p className="font-medium">Attention :</p>
              <p>Cette action marquera l'ordre comme non-conforme et le mettra en priorité urgente pour correction.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Type de défaut */}
            <div className="space-y-2">
              <Label htmlFor="defect-type">Type de défaut *</Label>
              <Select value={selectedDefectType} onValueChange={setSelectedDefectType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le type de défaut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hygiene">Hygiène</SelectItem>
                  <SelectItem value="aspect">Aspect visuel</SelectItem>
                  <SelectItem value="texture">Texture</SelectItem>
                  <SelectItem value="gout">Goût</SelectItem>
                  <SelectItem value="temperature">Température</SelectItem>
                  <SelectItem value="emballage">Emballage</SelectItem>
                  <SelectItem value="quantite">Quantité</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Motifs de non-conformité */}
            <div className="space-y-2">
              <Label htmlFor="reason">Motifs de non-conformité *</Label>
              <Textarea
                id="reason"
                value={nonConformityReason}
                onChange={(e) => setNonConformityReason(e.target.value)}
                placeholder="Décrivez précisément les problèmes constatés..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Solution corrective */}
            <div className="space-y-2">
              <Label htmlFor="solution">Solution corrective proposée *</Label>
              <Textarea
                id="solution"
                value={correctiveSolution}
                onChange={(e) => setCorrectiveSolution(e.target.value)}
                placeholder="Décrivez les actions correctives à mettre en place..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsNonConformityDialogOpen(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleNonConformitySubmit}
            disabled={loading || !selectedDefectType || !nonConformityReason || !correctiveSolution}
            className="flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {loading ? 'Enregistrement...' : 'Confirmer Non-Conformité'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}