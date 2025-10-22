-- SCRIPT DE CORRECTION POUR L'ERREUR 400 SUR /rest/v1/orders
-- Ce script résout les problèmes de création de commandes

-- ============================================
-- PARTIE 1: DÉSACTIVER RLS
-- ============================================

ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTIE 2: SUPPRIMER TOUTES LES POLICIES
-- ============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE tablename IN ('orders', 'order_items', 'customers', 'order_status_history')
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Policy supprimée: % sur %', r.policyname, r.tablename;
    END LOOP;
END $$;

-- ============================================
-- PARTIE 3: S'ASSURER QUE created_by EST NULLABLE
-- ============================================

-- Rendre la colonne created_by nullable si elle ne l'est pas
ALTER TABLE orders
ALTER COLUMN created_by DROP NOT NULL;

-- Ajouter created_by si elle n'existe pas
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- ============================================
-- PARTIE 4: ACCORDER LES PERMISSIONS
-- ============================================

GRANT ALL ON orders TO anon;
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO anon;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON customers TO anon;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON order_status_history TO anon;
GRANT ALL ON order_status_history TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- PARTIE 5: VÉRIFICATIONS
-- ============================================

-- Vérifier la structure de la table orders
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('id', 'order_number', 'customer_id', 'status', 'created_by', 'delivery_date', 'total_amount')
ORDER BY ordinal_position;

-- Vérifier que RLS est désactivé
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '❌ RLS ACTIVÉ' ELSE '✅ RLS Désactivé' END as rls_status
FROM pg_tables
WHERE tablename IN ('orders', 'order_items', 'customers', 'order_status_history')
ORDER BY tablename;

-- Vérifier qu'il n'y a plus de policies
SELECT
    COUNT(*) as policies_restantes
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'customers', 'order_status_history');

-- Test de lecture
SELECT COUNT(*) as total_commandes FROM orders;
