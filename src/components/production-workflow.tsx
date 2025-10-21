'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Factory,
  CheckCircle,
  Clock,
  Play,
  Square,
  AlertCircle,
  Package,
  Truck,
  Info
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateProductionOrderStatus, markProductionOrderAsPartial, type ProductionOrder } from '@/lib/supabase-service';

interface ProductionWorkflowProps {
  order: ProductionOrder;
  userRole: string;
  onStatusChange: (newStatus: string) => void;
}

export function ProductionWorkflow({
  order,
  userRole,
  onStatusChange
}: ProductionWorkflowProps) {
  const [loading, setLoading] = useState(false);
  const [isPartialDialogOpen, setIsPartialDialogOpen] = useState(false);
  const [partialNotes, setPartialNotes] = useState('');
  const { toast } = useToast();

  // Workflow étapes pour le rôle Production
  const workflowSteps = [
    {
      key: 'cree',
      label: 'Ordre créé',
      description: 'OF créé et en attente de validation',
      icon: Clock,
      color: 'bg-gray-100 text-gray-800',
      completed: ['validation_production', 'production_validee', 'en_fabrication', 'production_terminee', 'termine'].includes(order.status),
      current: order.status === 'cree'
    },
    {
      key: 'validation_production',
      label: 'Validation Production',
      description: 'Valider les produits individuellement',
      icon: CheckCircle,
      color: 'bg-blue-100 text-blue-800',
      completed: ['production_validee', 'en_fabrication', 'production_terminee', 'termine'].includes(order.status),
      current: order.status === 'validation_production'
    },
    {
      key: 'production_validee',
      label: 'Production validée',
      description: 'Prêt pour la fabrication',
      icon: Factory,
      color: 'bg-green-100 text-green-800',
      completed: ['en_fabrication', 'production_terminee', 'termine'].includes(order.status),
      current: order.status === 'production_validee'
    },
    {
      key: 'en_fabrication',
      label: 'En fabrication',
      description: 'Production en cours',
      icon: Play,
      color: 'bg-orange-100 text-orange-800',
      completed: ['production_terminee', 'termine'].includes(order.status),
      current: order.status === 'en_fabrication'
    },
    {
      key: 'production_terminee',
      label: 'Production terminée',
      description: 'Prêt pour livraison',
      icon: Package,
      color: 'bg-purple-100 text-purple-800',
      completed: ['termine'].includes(order.status),
      current: order.status === 'production_terminee'
    },
    {
      key: 'termine',
      label: 'Terminé',
      description: 'Livré et finalisé',
      icon: Truck,
      color: 'bg-green-100 text-green-800',
      completed: false,
      current: order.status === 'termine'
    }
  ];

  const getProgress = () => {
    const stepIndex = workflowSteps.findIndex(step => step.current || (!step.completed && !step.current));
    return stepIndex >= 0 ? (stepIndex / (workflowSteps.length - 1)) * 100 : 100;
  };

  const canPerformAction = (action: string) => {
    if (userRole !== 'Production') return false;

    switch (action) {
      case 'start_production':
        return order.status === 'production_validee';
      case 'finish_production':
        return order.status === 'en_fabrication';
      case 'mark_ready':
        return order.status === 'production_terminee';
      default:
        return false;
    }
  };

  const handleStatusUpdate = async (newStatus: string, actionLabel: string) => {
    setLoading(true);
    try {
      const success = await updateProductionOrderStatus(order.id, newStatus as any);
      if (success) {
        toast({
          title: 'Statut mis à jour',
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

  const handlePartialProductionSubmit = async () => {
    if (!partialNotes.trim()) {
      toast({
        title: 'Notes manquantes',
        description: 'Veuillez expliquer pourquoi la production est partielle',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Marquer comme production partielle et mettre le statut à 'production_terminee'
      const partialResult = await markProductionOrderAsPartial(order.id, partialNotes);
      const statusResult = await updateProductionOrderStatus(order.id, 'production_terminee');

      if (partialResult && statusResult) {
        toast({
          title: 'Production partielle terminée',
          description: 'L\'ordre a été marqué comme production partielle terminée'
        });
        onStatusChange('production_terminee');
        setIsPartialDialogOpen(false);
        setPartialNotes('');
      } else {
        throw new Error('Échec de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur production partielle:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de finaliser la production partielle',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== 'Production') {
    return null;
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="w-5 h-5" />
          Workflow Production
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress global */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progression</span>
            <span>{Math.round(getProgress())}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        <Separator />

        {/* Étapes du workflow */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">ÉTAPES DE PRODUCTION</h3>

          {workflowSteps.map((step, index) => {
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
                  {index < workflowSteps.length - 1 && (
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

        {/* Actions disponibles */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">ACTIONS DISPONIBLES</h3>

          {order.status === 'production_validee' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Vous pouvez maintenant démarrer la production de cet ordre.
              </AlertDescription>
            </Alert>
          )}

          {order.status === 'en_fabrication' && (
            <Alert>
              <Factory className="h-4 w-4" />
              <AlertDescription>
                Production en cours. Marquez comme terminé une fois la fabrication complète.
              </AlertDescription>
            </Alert>
          )}

          {order.status === 'production_terminee' && (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                Production terminée. L'ordre est prêt pour la livraison.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 flex-wrap">
            {canPerformAction('start_production') && (
              <Button
                onClick={() => handleStatusUpdate('en_fabrication', 'Démarrage de production')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Démarrer la production
              </Button>
            )}

            {canPerformAction('finish_production') && (
              <>
                <Button
                  onClick={() => handleStatusUpdate('production_terminee', 'Fin de production')}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Terminer la production
                </Button>
                <Button
                  onClick={() => setIsPartialDialogOpen(true)}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2 bg-orange-50 text-orange-700 hover:bg-orange-100"
                >
                  <AlertCircle className="w-4 h-4" />
                  Terminer (Partielle)
                </Button>
              </>
            )}

            {canPerformAction('mark_ready') && (
              <Button
                onClick={() => handleStatusUpdate('termine', 'Finalisation')}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Marquer comme livré
              </Button>
            )}
          </div>
        </div>

        {/* Informations sur l'ordre */}
        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Laboratoire:</span>
            <p className="font-medium">{order.laboratory}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Priorité:</span>
            <Badge variant="outline" className="ml-1">
              {order.priority}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Produits:</span>
            <p className="font-medium">{order.items.length} article(s)</p>
          </div>
          <div>
            <span className="text-muted-foreground">BC liés:</span>
            <p className="font-medium">{order.bcOrigins?.length || 0} commande(s)</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Dialog de production partielle */}
    <Dialog open={isPartialDialogOpen} onOpenChange={setIsPartialDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Production Partielle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-sm text-orange-800">
              <p className="font-medium">Attention :</p>
              <p>Cette action marquera l'ordre comme ayant une production partielle. Veuillez indiquer les quantités produites et les raisons.</p>
            </div>
          </div>

          {/* Résumé des produits */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">PRODUITS DANS CET ORDRE</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>{item.productName}</span>
                  <span className="text-muted-foreground">
                    Quantité requise: {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes explicatives */}
          <div className="space-y-2">
            <Label htmlFor="partial-notes">Explication de la production partielle *</Label>
            <Textarea
              id="partial-notes"
              value={partialNotes}
              onChange={(e) => setPartialNotes(e.target.value)}
              placeholder="Expliquez pourquoi la production n'est que partielle (quantités manquantes, problèmes techniques, etc.)..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Ces informations aideront à planifier les actions correctives nécessaires.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsPartialDialogOpen(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={handlePartialProductionSubmit}
            disabled={loading || !partialNotes.trim()}
            className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {loading ? 'Enregistrement...' : 'Confirmer Production Partielle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}