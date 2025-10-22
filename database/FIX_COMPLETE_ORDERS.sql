-- ============================================
-- CORRECTION COMPLÈTE POUR LA TABLE ORDERS
-- ============================================
-- Ce script corrige TOUS les problèmes de la table orders

-- ============================================
-- ÉTAPE 1: DÉSACTIVER COMPLÈTEMENT RLS ET SUPPRIMER LES POLICIES
-- ============================================
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_status_history DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('orders', 'order_items', 'customers', 'products', 'order_status_history')
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================
-- ÉTAPE 2: S'ASSURER QUE TOUTES LES COLONNES EXISTENT
-- ============================================

-- Colonne created_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE orders ADD COLUMN created_by VARCHAR(255);
        RAISE NOTICE '✅ Colonne created_by ajoutée';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne created_by existe déjà';
    END IF;
END $$;

-- Colonne lab_delivery_hours
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'lab_delivery_hours'
    ) THEN
        ALTER TABLE orders ADD COLUMN lab_delivery_hours INTEGER DEFAULT 2;
        RAISE NOTICE '✅ Colonne lab_delivery_hours ajoutée';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne lab_delivery_hours existe déjà';
    END IF;
END $$;

-- Colonne delivery_location
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'delivery_location'
    ) THEN
        ALTER TABLE orders ADD COLUMN delivery_location TEXT;
        RAISE NOTICE '✅ Colonne delivery_location ajoutée';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne delivery_location existe déjà';
    END IF;
END $$;

-- Vérifier que toutes les colonnes de base existent
DO $$
DECLARE
    missing_cols TEXT[] := '{}';
BEGIN
    -- Liste des colonnes essentielles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'id') THEN
        missing_cols := array_append(missing_cols, 'id');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_number') THEN
        missing_cols := array_append(missing_cols, 'order_number');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_id') THEN
        missing_cols := array_append(missing_cols, 'customer_id');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status') THEN
        missing_cols := array_append(missing_cols, 'status');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_date') THEN
        missing_cols := array_append(missing_cols, 'delivery_date');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total_amount') THEN
        missing_cols := array_append(missing_cols, 'total_amount');
    END IF;

    IF array_length(missing_cols, 1) > 0 THEN
        RAISE EXCEPTION '❌ COLONNES CRITIQUES MANQUANTES: %', missing_cols;
    ELSE
        RAISE NOTICE '✅ Toutes les colonnes critiques sont présentes';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 3: VÉRIFIER ET CORRIGER LES TYPES DE COLONNES
-- ============================================

-- S'assurer que status accepte les valeurs modernes
DO $$
BEGIN
    -- Vérifier si c'est un ENUM et le recréer si nécessaire
    IF EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'order_status'
    ) THEN
        -- Supprimer l'enum existant et recréer
        ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(50);
        DROP TYPE IF EXISTS order_status CASCADE;
        RAISE NOTICE '✅ Type status converti en VARCHAR(50)';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 4: ACCORDER TOUS LES PRIVILÈGES
-- ============================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Tables spécifiques
GRANT ALL ON orders TO anon, authenticated, public;
GRANT ALL ON order_items TO anon, authenticated, public;
GRANT ALL ON customers TO anon, authenticated, public;
GRANT ALL ON products TO anon, authenticated, public;

-- Séquences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- ÉTAPE 5: DIAGNOSTIC FINAL
-- ============================================

-- Afficher la structure complète de la table orders
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Vérifier RLS
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '❌ RLS ACTIVÉ' ELSE '✅ RLS DÉSACTIVÉ' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'orders';

-- Vérifier les policies
SELECT
    COUNT(*) as nombre_policies,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ Aucune policy restrictive'
        ELSE '⚠️ Des policies existent encore'
    END as status
FROM pg_policies
WHERE tablename = 'orders';

-- Message final
SELECT '✅ SCRIPT TERMINÉ - La table orders devrait maintenant fonctionner correctement' as resultat;
