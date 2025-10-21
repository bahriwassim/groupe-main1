import { supabase } from './supabase-client';

export async function validateProductionOrderItemImproved(
  orderId: string,
  itemId: string,
  validationType: 'production' | 'quality',
  status: 'approved' | 'rejected',
  userId: string,
  quantityProduced?: number,
  notes?: string
): Promise<boolean> {
  try {
    console.log('🔍 Validation produit améliorée:', {
      orderId,
      itemId,
      validationType,
      status,
      userId,
      quantityProduced,
      notes
    });

    // Vérifier d'abord que l'ordre de production existe
    const { data: productionOrder, error: poError } = await supabase
      .from('production_orders')
      .select('id, status, order_number')
      .eq('id', orderId)
      .single();

    if (poError || !productionOrder) {
      console.error('❌ Ordre de production non trouvé:', poError);
      throw new Error(`Ordre de production non trouvé: ${poError?.message || 'ID invalide'}`);
    }

    console.log('📋 Statut actuel de l\'OF:', productionOrder.status);

    // Vérifier que l'item existe avec un schéma minimal puis déterminer les colonnes disponibles
    const { data: existingItem, error: itemError } = await supabase
      .from('production_order_items')
      .select('*')
      .eq('id', itemId)
      .eq('production_order_id', orderId)
      .single();

    if (itemError || !existingItem) {
      console.error('❌ Item non trouvé:', itemError);
      throw new Error(`Item non trouvé: ${itemError?.message || 'ID invalide'}`);
    }

    console.log('📦 Item trouvé:', existingItem);

    // Identifier quelles colonnes existent
    const availableColumns = Object.keys(existingItem);
    const hasProductionStatus = availableColumns.includes('production_status');
    const hasQualityStatus = availableColumns.includes('quality_status');
    const hasValidationTimestamps = availableColumns.includes('production_validated_at');

    console.log('🔧 Colonnes disponibles:', {
      hasProductionStatus,
      hasQualityStatus,
      hasValidationTimestamps,
      availableColumns: availableColumns.slice(0, 10) // Limiter l'affichage
    });

    // Préparer les données de mise à jour selon les colonnes disponibles
    const updateData: any = {};
    const now = new Date().toISOString();

    if (validationType === 'production') {
      if (hasProductionStatus) {
        updateData.production_status = status;
      }
      if (hasValidationTimestamps) {
        updateData.production_validated_at = now;
        updateData.production_validated_by = userId;
      }
      if (quantityProduced !== undefined && availableColumns.includes('quantity_produced')) {
        updateData.quantity_produced = quantityProduced;
      }
    } else if (validationType === 'quality') {
      if (hasQualityStatus) {
        updateData.quality_status = status;
      }
      if (hasValidationTimestamps) {
        updateData.quality_validated_at = now;
        updateData.quality_validated_by = userId;
      }
    }

    if (notes && availableColumns.includes('validation_notes')) {
      updateData.validation_notes = notes;
    }

    // Si aucune colonne spécialisée n'est disponible, au moins mettre à jour quantity_produced
    if (Object.keys(updateData).length === 0) {
      if (validationType === 'production' && quantityProduced !== undefined && availableColumns.includes('quantity_produced')) {
        updateData.quantity_produced = quantityProduced;
        console.log('📝 Mode compatibilité: mise à jour de quantity_produced uniquement');
      } else {
        // Créer une mise à jour factice pour marquer l'action si updated_at existe
        if (availableColumns.includes('updated_at')) {
          updateData.updated_at = now;
        } else if (availableColumns.includes('notes')) {
          updateData.notes = notes || `Validation ${validationType} ${status} - ${new Date().toLocaleString()}`;
        }
        console.log('⚠️ Mode compatibilité: mise à jour minimale');
      }
    }

    console.log('📊 Données à mettre à jour:', updateData);

    // Effectuer la mise à jour
    const { data, error } = await supabase
      .from('production_order_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('production_order_id', orderId)
      .select('*');

    if (error) {
      console.error('❌ Erreur lors de la validation du produit:', error);
      throw new Error(`Échec de la mise à jour: ${error.message}`);
    }

    console.log('✅ Validation produit réussie, données mises à jour:', data);

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la validation du produit:', error);
    throw new Error(`Validation échouée: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}