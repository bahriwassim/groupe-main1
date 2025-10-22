-- Test final pourz vérifier que tout fonctionne

-- 1. Vérifier que RLS est bien désactivé
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '❌ RLS ACTIVÉ' ELSE '✅ RLS DÉSACTIVÉ' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('orders', 'order_items', 'customers', 'products')
ORDER BY tablename;

-- 2. Tester un SELECT simple sur orders
SELECT COUNT(*) as total_orders FROM orders;

-- 3. Vérifier qu'il n'y a pas de policies restrictives
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as "Type"
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'customers')
ORDER BY tablename, policyname;

-- 4. Vérifier les permissions de la table
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY grantee;

-- 5. Message final
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = 'orders'
            AND rowsecurity = false
        )
        THEN '✅ La table orders est accessible - RLS désactivé'
        ELSE '❌ PROBLÈME: RLS encore activé sur orders'
    END as resultat;
