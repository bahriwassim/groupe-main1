-- ============================================
-- CORRECTION CONTRAINTE STATUS POUR ORDERS
-- ============================================
-- Ce script corrige la contrainte CHECK sur le statut pour accepter 'en_attente'

-- 1. Lister les contraintes CHECK actuelles
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    RAISE NOTICE '=== CONTRAINTES CHECK ACTUELLES ===';
    FOR constraint_rec IN
        SELECT
            con.conname AS constraint_name,
            pg_get_constraintdef(con.oid) AS constraint_definition
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'orders'
        AND nsp.nspname = 'public'
        AND con.contype = 'c'
    LOOP
        RAISE NOTICE 'Contrainte: % - Définition: %', constraint_rec.constraint_name, constraint_rec.constraint_definition;
    END LOOP;
END $$;

-- 2. Supprimer les anciennes contraintes CHECK sur le statut
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN
        SELECT con.conname AS constraint_name
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'orders'
        AND nsp.nspname = 'public'
        AND con.contype = 'c'
        AND (
            pg_get_constraintdef(con.oid) ILIKE '%status%'
            OR con.conname ILIKE '%status%'
        )
    LOOP
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT IF EXISTS %I', constraint_rec.constraint_name);
        RAISE NOTICE '✅ Contrainte supprimée: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- 3. Créer une nouvelle contrainte CHECK avec tous les statuts possibles
ALTER TABLE orders
ADD CONSTRAINT orders_status_check
CHECK (status IN (
    -- Anciens statuts (format avec majuscule)
    'Saisi',
    'Validé',
    'En fabrication',
    'Terminé',
    'Annulé',
    'Prêt',
    'Livré',
    'Contrôle qualité',

    -- Nouveaux statuts (format snake_case)
    'en_attente',
    'valide_admin',
    'en_fabrication',
    'controle_qualite',
    'termine',
    'pret',
    'livre',
    'annule',

    -- Statuts de production
    'cree',
    'validation_production',
    'production_validee',
    'validation_qualite',
    'qualite_validee',
    'non_conforme'
));

RAISE NOTICE '✅ Nouvelle contrainte créée avec tous les statuts possibles';

-- 4. Tester l'insertion avec différents statuts
DO $$
DECLARE
    test_customer_id UUID;
    test_order_id UUID;
    test_statuses TEXT[] := ARRAY['en_attente', 'Saisi', 'valide_admin', 'Validé'];
    test_status TEXT;
BEGIN
    -- Créer un client de test
    INSERT INTO customers (name, tax_id, contact, address)
    VALUES ('TEST STATUS CLIENT', 'TEST-STATUS', 'TEST CONTACT', 'TEST ADDRESS')
    RETURNING id INTO test_customer_id;

    RAISE NOTICE '=== TESTS D''INSERTION ===';

    -- Tester chaque statut
    FOREACH test_status IN ARRAY test_statuses
    LOOP
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
                'BC-TEST-' || test_status,
                test_customer_id,
                NOW() + INTERVAL '1 day',
                100.00,
                100.00,
                0,
                0,
                0,
                test_status
            ) RETURNING id INTO test_order_id;

            RAISE NOTICE '✅ Insertion réussie avec status: %', test_status;

            -- Nettoyer
            DELETE FROM orders WHERE id = test_order_id;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erreur avec status %: % (Code: %)', test_status, SQLERRM, SQLSTATE;
        END;
    END LOOP;

    -- Nettoyer le client de test
    DELETE FROM customers WHERE id = test_customer_id;

    RAISE NOTICE '=== FIN DES TESTS ===';
END $$;
