-- Script de diagnostic pour les erreurs 400 sur la table orders
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Vérifier la structure de la table orders
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- 2. Vérifier si RLS est activé sur orders
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'orders';

-- 3. Vérifier les policies RLS existantes
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'orders';

-- 4. Vérifier si les tables liées existent
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('orders', 'order_items', 'order_status_history', 'customers')
ORDER BY table_name;

-- 5. Tester une requête simple sur orders
SELECT COUNT(*) as total_orders FROM orders;

-- 6. CORRECTION: Désactiver RLS temporairement pour déboguer
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- 7. CORRECTION: S'assurer que la colonne created_by existe
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- 8. Si vous voulez réactiver RLS plus tard avec une policy permissive:
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "Allow all access to orders" ON orders;
-- CREATE POLICY "Allow all access to orders" ON orders
--   FOR ALL
--   TO authenticated, anon
--   USING (true)
--   WITH CHECK (true);
