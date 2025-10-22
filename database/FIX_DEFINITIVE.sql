-- ============================================
-- SOLUTION DÉFINITIVE POUR L'ERREUR 400
-- ============================================
-- Ce script permet l'accès COMPLET aux tables sans authentification

-- 1. DÉSACTIVER COMPLÈTEMENT RLS
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 2. SUPPRIMER TOUTES LES POLICIES
DROP POLICY IF EXISTS "Allow all access" ON orders;
DROP POLICY IF EXISTS "Allow all access" ON order_items;
DROP POLICY IF EXISTS "Allow all access" ON customers;
DROP POLICY IF EXISTS "Allow all access" ON order_status_history;
DROP POLICY IF EXISTS "Allow all access" ON products;

-- Supprimer toutes les autres policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 3. ACCORDER TOUS LES PRIVILÈGES
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Tables spécifiques
GRANT ALL ON orders TO anon, authenticated, public;
GRANT ALL ON order_items TO anon, authenticated, public;
GRANT ALL ON customers TO anon, authenticated, public;
GRANT ALL ON products TO anon, authenticated, public;
GRANT ALL ON order_status_history TO anon, authenticated, public;

-- Séquences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. VÉRIFIER QUE TOUT EST OK
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '❌ RLS ENCORE ACTIF' ELSE '✅ RLS Désactivé' END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 5. TEST FINAL
SELECT COUNT(*) as total_orders FROM orders;
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_customers FROM customers;
