'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/use-role';
import {
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wrench
} from 'lucide-react';
import { repairStuckOrderStatuses, diagnoseOrderStatus } from '@/lib/status-repair';

interface StatusRepairToolProps {
  onRepairComplete?: () => void;
}

export function StatusRepairTool({ onRepairComplete }: StatusRepairToolProps) {
  const { role } = useRole();
  const { toast } = useToast();
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<{ repaired: number; errors: string[] } | null>(null);

  // Seuls les administrateurs et production peuvent utiliser cet outil
  const canRepair = role === 'Admin' || role === 'Production';

  const handleRepair = async () => {
    if (!canRepair) {
      toast({
        title: 'Accès refusé',
        description: 'Vous n\'avez pas les permissions pour utiliser cet outil.',
        variant: 'destructive'
      });
      return;
    }

    setIsRepairing(true);
    setRepairResult(null);

    try {
      console.log('🔧 Démarrage réparation des statuts...');

      const result = await repairStuckOrderStatuses();

      setRepairResult(result);

      if (result.repaired > 0) {
        toast({
          title: 'Réparation réussie',
          description: `${result.repaired} ordre(s) de fabrication ont été réparés.`
        });

        // Notifier le parent pour rafraîchir les données
        onRepairComplete?.();
      } else {
        toast({
          title: 'Aucune réparation nécessaire',
          description: 'Tous les ordres sont dans un état correct.'
        });
      }

      if (result.errors.length > 0) {
        console.warn('⚠️ Erreurs durant la réparation:', result.errors);
        toast({
          title: 'Réparation partielle',
          description: `${result.repaired} réparés, ${result.errors.length} erreurs.`,
          variant: 'destructive'
        });
      }

    } catch (error) {
      console.error('❌ Erreur lors de la réparation:', error);
      toast({
        title: 'Erreur de réparation',
        description: `Impossible de réparer les statuts: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        variant: 'destructive'
      });
    } finally {
      setIsRepairing(false);
    }
  };

  if (!canRepair) {
    return null; // Ne pas afficher l'outil si pas de permissions
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Wrench className="w-5 h-5" />
          Outil de Réparation des Statuts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-orange-700">
          <p>
            Cet outil permet de diagnostiquer et corriger les ordres de fabrication bloqués dans un statut incorrect.
          </p>
          <p className="mt-2">
            Utilisez-le si vous remarquez que des ordres ne progressent pas automatiquement après les validations.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleRepair}
            disabled={isRepairing}
            variant="outline"
            className="border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
          >
            {isRepairing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Réparation en cours...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Réparer les Statuts
              </>
            )}
          </Button>
        </div>

        {repairResult && (
          <div className="space-y-2 mt-4 p-3 bg-white rounded-lg border">
            <h4 className="font-medium text-sm">Résultat de la réparation :</h4>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                {repairResult.repaired} réparés
              </Badge>

              {repairResult.errors.length > 0 && (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <XCircle className="w-3 h-3 mr-1" />
                  {repairResult.errors.length} erreurs
                </Badge>
              )}
            </div>

            {repairResult.errors.length > 0 && (
              <div className="text-xs text-red-600 space-y-1">
                <p className="font-medium">Erreurs :</p>
                {repairResult.errors.slice(0, 3).map((error, index) => (
                  <p key={index} className="truncate">• {error}</p>
                ))}
                {repairResult.errors.length > 3 && (
                  <p>... et {repairResult.errors.length - 3} autres erreurs</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          Cette opération analyse tous les ordres et met à jour leur statut selon les validations effectuées.
        </div>
      </CardContent>
    </Card>
  );
}