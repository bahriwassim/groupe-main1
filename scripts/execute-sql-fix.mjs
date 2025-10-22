import fetch from 'node-fetch';

const SUPABASE_URL = 'https://kmgmhgqopmlxtdhnugpz.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZ21oZ3FvcG1seHRkaG51Z3B6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjQzMTU3OSwiZXhwIjoyMDUyMDA3NTc5fQ.xv0lG_8D5qfzwqcvBGu2oYaUSrHsMHgkGGl_6gF8Bwc';

console.log('🔧 Application du fix pour "order_id is ambiguous" via API REST...\n');

// La fonction SQL corrigée (simplifiée pour l'exécution)
const sqlFix = `
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
    v_order_id := COALESCE(NEW.production_order_id, OLD.production_order_id);
    IF v_order_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE poi.production_status = 'approved'), COUNT(*) FILTER (WHERE poi.production_status = 'rejected'), COUNT(*) FILTER (WHERE poi.quality_status = 'approved'), COUNT(*) FILTER (WHERE poi.quality_status = 'rejected')
    INTO v_total_items, v_production_approved, v_production_rejected, v_quality_approved, v_quality_rejected
    FROM production_order_items poi
    WHERE poi.production_order_id = v_order_id;

    SELECT po.status INTO v_current_status FROM production_orders po WHERE po.id = v_order_id;

    IF v_production_approved = v_total_items AND v_current_status IN ('cree', 'validation_production', 'non_conforme') THEN
        UPDATE production_orders po SET status = 'production_validee', updated_at = NOW() WHERE po.id = v_order_id;
    ELSIF v_production_rejected > 0 AND v_current_status IN ('cree', 'validation_production') THEN
        UPDATE production_orders po SET status = 'non_conforme', updated_at = NOW() WHERE po.id = v_order_id;
    ELSIF v_quality_approved = v_total_items AND v_current_status IN ('validation_qualite', 'production_validee') THEN
        UPDATE production_orders po SET status = 'qualite_validee', updated_at = NOW() WHERE po.id = v_order_id;
    ELSIF v_quality_rejected > 0 AND v_current_status = 'validation_qualite' THEN
        UPDATE production_orders po SET status = 'non_conforme', updated_at = NOW() WHERE po.id = v_order_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
`;

try {
  console.log('📝 Tentative d\'exécution du SQL...');

  // Essayer d'exécuter via l'API REST PostgREST
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sqlFix })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log('⚠️  L\'API REST ne peut pas exécuter ce type de commande SQL');
    console.log('   Erreur:', errorText.substring(0, 200));
    console.log('\n📋 Veuillez utiliser le SQL Editor de Supabase Dashboard à la place:');
    console.log('   👉 https://supabase.com/dashboard/project/kmgmhgqopmlxtdhnugpz/sql/new');
    console.log('\n📄 Copiez le contenu du fichier: database/FIX_ORDER_ID_AMBIGUOUS.sql');
    process.exit(1);
  }

  const result = await response.json();
  console.log('✅ Fix appliqué avec succès!');
  console.log('   Résultat:', result);

} catch (error) {
  console.error('❌ Erreur lors de l\'exécution:', error.message);
  console.log('\n📋 Veuillez exécuter manuellement le SQL dans Supabase Dashboard:');
  console.log('   👉 https://supabase.com/dashboard/project/kmgmhgqopmlxtdhnugpz/sql/new');
  console.log('\n📄 Fichier SQL: database/FIX_ORDER_ID_AMBIGUOUS.sql');
  process.exit(1);
}
