import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkColumnTypes() {
  console.log('🔍 Vérification des types de colonnes *validated_by et created_by...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
          table_name,
          column_name,
          data_type,
          udt_name,
          character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND (
        (table_name IN ('production_order_items', 'production_orders', 'orders')
         AND (column_name LIKE '%validated_by%' OR column_name = 'created_by'))
      )
      ORDER BY table_name, column_name;
    `
  });

  if (error) {
    console.error('❌ Erreur:', error);

    // Essayer avec une requête simple directement
    console.log('\n🔄 Tentative avec une requête simple...\n');

    const { data: columns, error: colError } = await supabase
      .from('production_order_items')
      .select('production_validated_by, quality_validated_by')
      .limit(1);

    console.log('Résultat:', columns, colError);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ Aucune colonne trouvée');
    return;
  }

  console.log('📊 Colonnes trouvées:\n');
  console.table(data);
}

checkColumnTypes().catch(console.error);
