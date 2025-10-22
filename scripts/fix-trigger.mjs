#!/usr/bin/env node
/**
 * Script pour corriger le trigger de notification qui cause l'erreur 400
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lcyevhpexzcrmbfozqwt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjeWV2aHBleHpjcm1iZm96cXd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjM1MDA0MSwiZXhwIjoyMDUxOTI2MDQxfQ.YfEfkOAKC90g7T4TiXW8LRzLVk0gvBJc5yOHd7eLLEE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const fixSQL = `
-- Recréer la fonction avec le bon nom de colonne
CREATE OR REPLACE FUNCTION notify_order_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    type,
    title,
    message,
    severity,
    entity_type,
    entity_id,
    related_date,
    metadata
  )
  VALUES (
    'order_created',
    'Nouvelle commande créée',
    'Commande ' || NEW.order_number || ' créée pour le ' || TO_CHAR(NEW.delivery_date, 'DD/MM/YYYY'),
    'info',
    'order',
    NEW.id,
    NEW.delivery_date,
    jsonb_build_object(
      'order_number', NEW.order_number,
      'delivery_date', NEW.delivery_date,
      'total_amount', NEW.total_amount
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

console.log('🔧 Correction du trigger notify_order_created()...');
console.log('');
console.log('⚠️ IMPORTANT: Ce script nécessite un accès direct à PostgreSQL.');
console.log('');
console.log('📋 Veuillez exécuter le SQL suivant dans le SQL Editor de Supabase:');
console.log('   https://supabase.com/dashboard/project/lcyevhpexzcrmbfozqwt/sql/new');
console.log('');
console.log('--- DÉBUT DU SQL ---');
console.log(fixSQL);
console.log('--- FIN DU SQL ---');
console.log('');
console.log('✅ Après avoir exécuté ce SQL, le problème de création de commande sera résolu.');
console.log('');
console.log('💡 Le problème était que le trigger utilisait NEW.total');
console.log('   mais la colonne s\'appelle total_amount dans la base de données.');
