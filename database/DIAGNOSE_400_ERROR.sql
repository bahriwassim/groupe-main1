-- ============================================
-- DIAGNOSTIC COMPLET POUR ERREUR 400
-- ============================================

-- 1. Vérifier la structure de la table orders
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes CHECK sur la table orders
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'orders'
AND nsp.nspname = 'public'
AND con.contype = 'c';

-- 3. Vérifier les NOT NULL constraints
SELECT
    column_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 4. Vérifier RLS
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('orders', 'order_items', 'customers', 'products');

-- 5. Lister toutes les policies RLS
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
WHERE tablename IN ('orders', 'order_items', 'customers', 'products');

-- 6. Tester une insertion simple
DO $$
DECLARE
    test_customer_id UUID;
    test_order_id UUID;
BEGIN
    -- Créer un client de test
    INSERT INTO customers (name, tax_id, contact, address)
    VALUES ('TEST CLIENT 400', 'TEST123', 'TEST CONTACT', 'TEST ADDRESS')
    RETURNING id INTO test_customer_id;

    RAISE NOTICE 'Client de test créé: %', test_customer_id;

    -- Essayer d'insérer une commande
    BEGIN
        INSERT INTO orders (
            order_number,
            customer_id,
            delivery_date,
            total_amount,
            remaining_amount,
            discount,
            advance,
            second_advance,
            status
        ) VALUES (
            'BC-TEST-400',
            test_customer_id,
            NOW() + INTERVAL '1 day',
            100.00,
            100.00,
            0,
            0,
            0,
            'en_attente'
        ) RETURNING id INTO test_order_id;

        RAISE NOTICE '✅ Insertion réussie avec status en_attente: %', test_order_id;

        -- Nettoyer
        DELETE FROM orders WHERE id = test_order_id;
        DELETE FROM customers WHERE id = test_customer_id;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur avec status en_attente: % %', SQLERRM, SQLSTATE;

        -- Réessayer avec 'Saisi'
        BEGIN
            INSERT INTO orders (
                order_number,
                customer_id,
                delivery_date,
                total_amount,
                remaining_amount,
                discount,
                advance,
                second_advance,
                status
            ) VALUES (
                'BC-TEST-400',
                test_customer_id,
                NOW() + INTERVAL '1 day',
                100.00,
                100.00,
                0,
                0,
                0,
                'Saisi'
            ) RETURNING id INTO test_order_id;

            RAISE NOTICE '✅ Insertion réussie avec status Saisi: %', test_order_id;

            -- Nettoyer
            DELETE FROM orders WHERE id = test_order_id;
            DELETE FROM customers WHERE id = test_customer_id;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erreur avec status Saisi: % %', SQLERRM, SQLSTATE;
            DELETE FROM customers WHERE id = test_customer_id;
        END;
    END;
END $$;
