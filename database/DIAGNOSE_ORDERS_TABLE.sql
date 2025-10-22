-- ============================================
-- DIAGNOSTIC COMPLET DE LA TABLE ORDERS
-- ============================================
-- Ce script identifie TOUS les problèmes possibles

-- 1. STRUCTURE DES COLONNES
SELECT
    '=== STRUCTURE DES COLONNES ===' as section;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- 2. CONTRAINTES CHECK
SELECT
    '=== CONTRAINTES CHECK ===' as section;

SELECT
    con.conname as constraint_name,
    pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'orders'
AND nsp.nspname = 'public'
AND con.contype = 'c'
ORDER BY con.conname;

-- 3. COLONNES NOT NULL
SELECT
    '=== COLONNES OBLIGATOIRES (NOT NULL) ===' as section;

SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
AND is_nullable = 'NO'
AND column_default IS NULL  -- Pas de valeur par défaut
ORDER BY ordinal_position;

-- 4. FOREIGN KEYS
SELECT
    '=== CLÉS ÉTRANGÈRES ===' as section;

SELECT
    con.conname as constraint_name,
    pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'orders'
AND nsp.nspname = 'public'
AND con.contype = 'f'
ORDER BY con.conname;

-- 5. TRIGGERS ACTIFS
SELECT
    '=== TRIGGERS ACTIFS ===' as section;

SELECT
    tgname as trigger_name,
    tgenabled as enabled,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'public.orders'::regclass
AND tgname NOT LIKE 'RI_%'  -- Exclure les triggers système
ORDER BY tgname;

-- 6. RLS (ROW LEVEL SECURITY)
SELECT
    '=== ROW LEVEL SECURITY ===' as section;

SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'orders'
AND schemaname = 'public';

-- 7. POLICIES RLS
SELECT
    '=== POLICIES RLS ===' as section;

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 8. PERMISSIONS
SELECT
    '=== PERMISSIONS ===' as section;

SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY grantee, privilege_type;

-- 9. TEST D'INSERTION SIMPLE
SELECT
    '=== TEST D''INSERTION ===' as section;

DO $$
DECLARE
    test_customer_id UUID;
    test_order_id UUID;
    test_order_number TEXT := 'BC-TEST-' || floor(random() * 1000000)::text;
BEGIN
    -- Créer un client de test
    INSERT INTO customers (name, tax_id, contact, address)
    VALUES ('CLIENT TEST DIAGNOSTIC', 'TEST-001', 'Test Contact', '123 Test Street')
    RETURNING id INTO test_customer_id;

    RAISE NOTICE '✅ Client test créé: %', test_customer_id;

    -- Essayer d'insérer une commande minimale
    BEGIN
        INSERT INTO orders (
            order_number,
            customer_id,
            delivery_date,
            status,
            total_amount,
            remaining_amount
        ) VALUES (
            test_order_number,
            test_customer_id,
            NOW() + INTERVAL '1 day',
            'Saisi',
            100.00,
            100.00
        ) RETURNING id INTO test_order_id;

        RAISE NOTICE '✅ Commande test créée avec succès: %', test_order_id;
        RAISE NOTICE '   Order number: %', test_order_number;

        -- Nettoyer
        DELETE FROM orders WHERE id = test_order_id;
        DELETE FROM customers WHERE id = test_customer_id;
        RAISE NOTICE '✅ Nettoyage effectué';

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ ERREUR lors de l''insertion de la commande:';
        RAISE NOTICE '   Message: %', SQLERRM;
        RAISE NOTICE '   Code: %', SQLSTATE;
        RAISE NOTICE '   Détails: %', SQLERRM;

        -- Nettoyer le client même en cas d'erreur
        DELETE FROM customers WHERE id = test_customer_id;
        RAISE NOTICE '   Client de test supprimé';
    END;
END $$;

-- 10. RÉSUMÉ FINAL
SELECT
    '=== RÉSUMÉ ===' as section;

DO $$
DECLARE
    rls_enabled BOOLEAN;
    trigger_count INTEGER;
    check_constraint_count INTEGER;
    required_columns INTEGER;
BEGIN
    -- Vérifier RLS
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE tablename = 'orders' AND schemaname = 'public';

    -- Compter triggers
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgrelid = 'public.orders'::regclass
    AND tgname NOT LIKE 'RI_%';

    -- Compter contraintes CHECK
    SELECT COUNT(*) INTO check_constraint_count
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'orders' AND con.contype = 'c';

    -- Compter colonnes obligatoires sans défaut
    SELECT COUNT(*) INTO required_columns
    FROM information_schema.columns
    WHERE table_name = 'orders'
    AND is_nullable = 'NO'
    AND column_default IS NULL;

    RAISE NOTICE '';
    RAISE NOTICE '📊 RÉSUMÉ DU DIAGNOSTIC:';
    RAISE NOTICE '  - RLS activé: %', CASE WHEN rls_enabled THEN 'OUI ⚠️' ELSE 'NON ✅' END;
    RAISE NOTICE '  - Nombre de triggers: %', trigger_count;
    RAISE NOTICE '  - Contraintes CHECK: %', check_constraint_count;
    RAISE NOTICE '  - Colonnes obligatoires (sans défaut): %', required_columns;
    RAISE NOTICE '';

    IF rls_enabled THEN
        RAISE NOTICE '⚠️ RLS EST ACTIVÉ - Cela peut bloquer les insertions';
        RAISE NOTICE '   Solution: Exécutez "ALTER TABLE orders DISABLE ROW LEVEL SECURITY;"';
    END IF;

    IF required_columns > 5 THEN
        RAISE NOTICE '⚠️ BEAUCOUP DE COLONNES OBLIGATOIRES (%)' , required_columns;
        RAISE NOTICE '   Vérifiez que toutes sont envoyées depuis le code';
    END IF;
END $$;
