import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kmgmhgqopmlxtdhnugpz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZ21oZ3FvcG1seHRkaG51Z3B6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjQzMTU3OSwiZXhwIjoyMDUyMDA3NTc5fQ.xv0lG_8D5qfzwqcvBGu2oYaUSrHsMHgkGGl_6gF8Bwc';

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

console.log('🔧 Application du fix pour "order_id is ambiguous"...\n');

// La fonction corrigée avec qualification explicite
const fixedFunction = `
CREATE OR REPLACE FUNCTION update_production_order_status_from_items()
RETURNS TRIGGER AS $$
DECLARE
    v_order_id UUID;
    v_total_items INTEGER;
    v_production_approved INTEGER;
    v_production_rejected INTEGER;
    v_quality_approved INTEGER;
    v_quality_rejected INTEGER;
    v_current_status VARCHAR(50);
BEGIN
    -- Récupérer l'ID de l'ordre de production (QUALIFICATION EXPLICITE)
    v_order_id := COALESCE(NEW.production_order_id, OLD.production_order_id);

    IF v_order_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Compter les items et leurs statuts (QUALIFICATION EXPLICITE avec alias)
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE poi.production_status = 'approved'),
        COUNT(*) FILTER (WHERE poi.production_status = 'rejected'),
        COUNT(*) FILTER (WHERE poi.quality_status = 'approved'),
        COUNT(*) FILTER (WHERE poi.quality_status = 'rejected')
    INTO
        v_total_items,
        v_production_approved,
        v_production_rejected,
        v_quality_approved,
        v_quality_rejected
    FROM production_order_items poi
    WHERE poi.production_order_id = v_order_id;

    -- Récupérer le statut actuel de l'ordre (QUALIFICATION EXPLICITE avec alias)
    SELECT po.status INTO v_current_status
    FROM production_orders po
    WHERE po.id = v_order_id;

    -- Logique de mise à jour du statut
    -- Si tous les items production sont approuvés
    IF v_production_approved = v_total_items AND v_current_status IN ('cree', 'validation_production', 'non_conforme') THEN
        UPDATE production_orders po
        SET status = 'production_validee', updated_at = NOW()
        WHERE po.id = v_order_id;

    -- Si au moins un item production est rejeté
    ELSIF v_production_rejected > 0 AND v_current_status IN ('cree', 'validation_production') THEN
        UPDATE production_orders po
        SET status = 'non_conforme', updated_at = NOW()
        WHERE po.id = v_order_id;

    -- Si tous les items qualité sont approuvés
    ELSIF v_quality_approved = v_total_items AND v_current_status IN ('validation_qualite', 'production_validee') THEN
        UPDATE production_orders po
        SET status = 'qualite_validee', updated_at = NOW()
        WHERE po.id = v_order_id;

    -- Si au moins un item qualité est rejeté
    ELSIF v_quality_rejected > 0 AND v_current_status = 'validation_qualite' THEN
        UPDATE production_orders po
        SET status = 'non_conforme', updated_at = NOW()
        WHERE po.id = v_order_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
`;

try {
  // Utiliser une requête RPC pour exécuter le SQL
  console.log('📝 Recréation de la fonction avec qualification explicite...');

  // Note: Supabase ne permet pas d'exécuter du DDL arbitraire via l'API
  // Il faut utiliser le SQL Editor dans le dashboard ou des migrations

  console.log('\n⚠️  IMPORTANT: Ce script ne peut pas modifier directement les fonctions PostgreSQL.');
  console.log('\n📋 Veuillez exécuter le SQL suivant dans le SQL Editor de Supabase:');
  console.log('\n' + '='.repeat(80));
  console.log(fixedFunction);
  console.log('='.repeat(80));

  console.log('\n📍 Étapes à suivre:');
  console.log('   1. Allez sur https://supabase.com/dashboard/project/kmgmhgqopmlxtdhnugpz/sql/new');
  console.log('   2. Copiez-collez le SQL ci-dessus');
  console.log('   3. Cliquez sur "Run"');
  console.log('   4. Testez la validation de production');

  console.log('\n💡 Le fichier SQL complet est disponible dans: database/FIX_ORDER_ID_AMBIGUOUS.sql');

} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}
