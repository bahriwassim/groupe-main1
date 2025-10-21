import { supabase } from './supabase-client';

// Fonction utilitaire pour réparer les statuts d'ordres bloqués
export async function repairStuckOrderStatuses(): Promise<{ repaired: number; errors: string[] }> {
  console.log('🔧 Démarrage réparation des statuts bloqués...');

  const repaired: string[] = [];
  const errors: string[] = [];

  try {
    // Récupérer tous les ordres de fabrication
    const { data: orders, error: ordersError } = await supabase
      .from('production_orders')
      .select('id, status, order_number')
      .in('status', ['cree', 'validation_production', 'production_validee', 'validation_qualite']);

    if (ordersError || !orders) {
      throw new Error(`Erreur récupération ordres: ${ordersError?.message}`);
    }

    console.log(`📋 ${orders.length} ordres à analyser`);

    for (const order of orders) {
      try {
        console.log(`🔍 Analyse ordre ${order.order_number} (${order.status})`);

        // Récupérer les items de cet ordre
        const { data: items, error: itemsError } = await supabase
          .from('production_order_items')
          .select('*')
          .eq('production_order_id', order.id);

        if (itemsError || !items || items.length === 0) {
          console.warn(`⚠️ Pas d'items pour ordre ${order.order_number}`);
          continue;
        }

        // Analyser les colonnes disponibles
        const firstItem = items[0];
        const availableColumns = Object.keys(firstItem);
        const hasProductionStatus = availableColumns.includes('production_status');
        const hasQualityStatus = availableColumns.includes('quality_status');

        let suggestedStatus = order.status;

        if (hasProductionStatus && hasQualityStatus) {
          // Mode complet - analyser les statuts des items
          const productionApproved = items.filter(item => item.production_status === 'approved').length;
          const qualityApproved = items.filter(item => item.quality_status === 'approved').length;
          const productionRejected = items.filter(item => item.production_status === 'rejected').length;
          const qualityRejected = items.filter(item => item.quality_status === 'rejected').length;

          console.log(`📊 Analyse détaillée ${order.order_number}:`, {
            total: items.length,
            productionApproved,
            qualityApproved,
            productionRejected,
            qualityRejected
          });

          // Logique de détermination du statut
          if (productionRejected > 0 || qualityRejected > 0) {
            suggestedStatus = 'non_conforme';
          } else if (qualityApproved === items.length) {
            suggestedStatus = 'qualite_validee';
          } else if (productionApproved === items.length) {
            suggestedStatus = 'production_validee';
          } else if (productionApproved > 0) {
            suggestedStatus = 'validation_production';
          }
        } else {
          // Mode compatibilité - utiliser des heuristiques simples
          console.log(`📝 Mode compatibilité pour ${order.order_number}`);

          // Si l'ordre est créé depuis longtemps, le faire progresser
          if (order.status === 'cree') {
            suggestedStatus = 'validation_production';
          }
        }

        // Mettre à jour si nécessaire
        if (suggestedStatus !== order.status) {
          console.log(`🔄 Réparation ${order.order_number}: ${order.status} → ${suggestedStatus}`);

          const { error: updateError } = await supabase
            .from('production_orders')
            .update({
              status: suggestedStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateError) {
            const errorMsg = `Erreur mise à jour ${order.order_number}: ${updateError.message}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
          } else {
            console.log(`✅ ${order.order_number} réparé`);
            repaired.push(order.order_number);
          }
        } else {
          console.log(`ℹ️ ${order.order_number} - statut correct`);
        }

      } catch (orderError) {
        const errorMsg = `Erreur traitement ordre ${order.order_number}: ${orderError}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`🎉 Réparation terminée: ${repaired.length} ordres réparés, ${errors.length} erreurs`);

    return {
      repaired: repaired.length,
      errors
    };

  } catch (error) {
    const errorMsg = `Erreur générale réparation: ${error}`;
    console.error(`❌ ${errorMsg}`);
    return {
      repaired: 0,
      errors: [errorMsg]
    };
  }
}

// Fonction pour diagnostiquer un ordre spécifique
export async function diagnoseOrderStatus(orderId: string): Promise<{
  order: any;
  items: any[];
  analysis: any;
  suggestions: string[];
}> {
  console.log(`🔍 Diagnostic ordre ${orderId}`);

  try {
    // Récupérer l'ordre
    const { data: order, error: orderError } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Ordre non trouvé: ${orderError?.message}`);
    }

    // Récupérer les items
    const { data: items, error: itemsError } = await supabase
      .from('production_order_items')
      .select('*')
      .eq('production_order_id', orderId);

    if (itemsError || !items) {
      throw new Error(`Items non trouvés: ${itemsError?.message}`);
    }

    // Analyser
    const analysis: any = {
      orderStatus: order.status,
      itemsCount: items.length,
      columns: items.length > 0 ? Object.keys(items[0]) : [],
      hasValidationColumns: items.length > 0 && Object.keys(items[0]).includes('production_status')
    };

    if (analysis.hasValidationColumns) {
      analysis.productionStatuses = {
        approved: items.filter(item => item.production_status === 'approved').length,
        rejected: items.filter(item => item.production_status === 'rejected').length,
        pending: items.filter(item => !item.production_status || item.production_status === 'pending').length
      };

      analysis.qualityStatuses = {
        approved: items.filter(item => item.quality_status === 'approved').length,
        rejected: items.filter(item => item.quality_status === 'rejected').length,
        pending: items.filter(item => !item.quality_status || item.quality_status === 'pending').length
      };
    }

    // Suggestions
    const suggestions: string[] = [];

    if (order.status === 'cree' && items.length > 0) {
      suggestions.push('Ordre créé - prêt pour validation production');
    }

    if (analysis.hasValidationColumns) {
      if (analysis.productionStatuses.approved === items.length) {
        suggestions.push('Tous les items production approuvés - peut passer à "production_validee"');
      }

      if (analysis.qualityStatuses.approved === items.length) {
        suggestions.push('Tous les items qualité approuvés - peut passer à "qualite_validee"');
      }

      if (analysis.productionStatuses.rejected > 0 || analysis.qualityStatuses.rejected > 0) {
        suggestions.push('Items rejetés détectés - devrait être "non_conforme"');
      }
    }

    return {
      order,
      items,
      analysis,
      suggestions
    };

  } catch (error) {
    throw new Error(`Erreur diagnostic: ${error}`);
  }
}