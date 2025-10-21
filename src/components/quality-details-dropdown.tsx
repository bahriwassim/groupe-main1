'use client'

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Info, Scale, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Order, OrderQualityDetails } from '@/lib/types';
import { getOrderQualityDetails, createOrderQualityDetails } from '@/lib/supabase-service';

interface QualityDetailsDropdownProps {
  order: Order;
  readOnly?: boolean;
}

export function QualityDetailsDropdown({ order, readOnly = false }: QualityDetailsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qualityDetails, setQualityDetails] = useState<OrderQualityDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    qualityNotes: '',
    qualityRequirements: '',
    quantityNotes: '',
    weightRequirements: '',
    dimensionsRequirements: '',
    hygieneRequirements: '',
    hygieneNotes: ''
  });

  useEffect(() => {
    if (isOpen && !qualityDetails) {
      loadQualityDetails();
    }
  }, [isOpen]);

  const loadQualityDetails = async () => {
    setLoading(true);
    try {
      const details = await getOrderQualityDetails(order.id);
      setQualityDetails(details);

      if (details) {
        setFormData({
          qualityNotes: details.qualityNotes || '',
          qualityRequirements: details.qualityRequirements || '',
          quantityNotes: details.quantityNotes || '',
          weightRequirements: details.weightRequirements || '',
          dimensionsRequirements: details.dimensionsRequirements || '',
          hygieneRequirements: details.hygieneRequirements || '',
          hygieneNotes: details.hygieneNotes || ''
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails qualité:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!qualityDetails) {
        // Créer nouveaux détails
        const newDetails = await createOrderQualityDetails({
          orderId: order.id,
          ...formData
        });
        setQualityDetails(newDetails);
      } else {
        // Mettre à jour existants - fonction à implémenter
        console.log('Mise à jour des détails qualité:', formData);
      }
      setEditing(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getLabDeliveryTime = () => {
    const deliveryDate = new Date(order.deliveryDate);
    const deliveryTime = order.deliveryTime || '08:00';
    const [hours, minutes] = deliveryTime.split(':').map(Number);

    deliveryDate.setHours(hours, minutes);

    const labHours = order.labDeliveryHours || 2;
    const labDeliveryTime = new Date(deliveryDate.getTime() - (labHours * 60 * 60 * 1000));

    return labDeliveryTime.toLocaleString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>Détails Qualité/Quantité</span>
            <Badge variant="secondary" className="ml-2">
              Livraison lab: {getLabDeliveryTime()}
            </Badge>
          </div>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 mt-4">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {/* Section Qualitative */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Beaker className="h-5 w-5 text-blue-500" />
                  Spécifications Qualitatives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="qualityRequirements">Exigences de qualité</Label>
                  {editing ? (
                    <Textarea
                      id="qualityRequirements"
                      value={formData.qualityRequirements}
                      onChange={(e) => handleInputChange('qualityRequirements', e.target.value)}
                      placeholder="Décrivez les exigences de qualité..."
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                      {qualityDetails?.qualityRequirements || 'Aucune exigence spécifiée'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="qualityNotes">Notes qualité</Label>
                  {editing ? (
                    <Textarea
                      id="qualityNotes"
                      value={formData.qualityNotes}
                      onChange={(e) => handleInputChange('qualityNotes', e.target.value)}
                      placeholder="Notes additionnelles sur la qualité..."
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                      {qualityDetails?.qualityNotes || 'Aucune note'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section Quantitative */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="h-5 w-5 text-green-500" />
                  Spécifications Quantitatives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weightRequirements">Exigences de poids</Label>
                    {editing ? (
                      <Input
                        id="weightRequirements"
                        value={formData.weightRequirements}
                        onChange={(e) => handleInputChange('weightRequirements', e.target.value)}
                        placeholder="ex: 500g ± 50g"
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                        {qualityDetails?.weightRequirements || 'Non spécifié'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="dimensionsRequirements">Dimensions</Label>
                    {editing ? (
                      <Input
                        id="dimensionsRequirements"
                        value={formData.dimensionsRequirements}
                        onChange={(e) => handleInputChange('dimensionsRequirements', e.target.value)}
                        placeholder="ex: 20cm x 15cm"
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                        {qualityDetails?.dimensionsRequirements || 'Non spécifié'}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="quantityNotes">Notes quantité</Label>
                  {editing ? (
                    <Textarea
                      id="quantityNotes"
                      value={formData.quantityNotes}
                      onChange={(e) => handleInputChange('quantityNotes', e.target.value)}
                      placeholder="Notes sur les quantités..."
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                      {qualityDetails?.quantityNotes || 'Aucune note'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section Hygiène */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5 text-purple-500" />
                  Exigences d'Hygiène
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="hygieneRequirements">Exigences d'hygiène</Label>
                  {editing ? (
                    <Textarea
                      id="hygieneRequirements"
                      value={formData.hygieneRequirements}
                      onChange={(e) => handleInputChange('hygieneRequirements', e.target.value)}
                      placeholder="Décrivez les exigences d'hygiène..."
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                      {qualityDetails?.hygieneRequirements || 'Exigences standard'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="hygieneNotes">Notes hygiène</Label>
                  {editing ? (
                    <Textarea
                      id="hygieneNotes"
                      value={formData.hygieneNotes}
                      onChange={(e) => handleInputChange('hygieneNotes', e.target.value)}
                      placeholder="Notes additionnelles sur l'hygiène..."
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                      {qualityDetails?.hygieneNotes || 'Aucune note spécifique'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {!readOnly && (
              <div className="flex gap-2 justify-end">
                {editing ? (
                  <>
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSave}>
                      Sauvegarder
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditing(true)}>
                    {qualityDetails ? 'Modifier' : 'Ajouter détails'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}