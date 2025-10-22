-- SCRIPT DE DIAGNOSTIC DÉTAILLÉ POUR LA TABLE ORDERS
-- Ce script va identifier quel champ cause l'erreur 400

-- ============================================
-- PARTIE 1: VÉRIFIER TOUTES LES COLONNES
-- ============================================

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

-- ============================================
-- PARTIE 2: VÉRIFIER LES TYPES DE DONNÉES PROBLÉMATIQUES
-- ============================================

-- Rechercher les colonnes avec des types complexes (JSON, arrays, etc.)
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
AND (
    data_type IN ('json', 'jsonb', 'ARRAY', 'USER-DEFINED')
    OR udt_name IN ('json', 'jsonb', '_text', '_varchar')
);

-- ============================================
-- PARTIE 3: VÉRIFIER LES CONTRAINTES
-- ============================================

SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.orders'::regclass;

-- ============================================
-- PARTIE 4: TESTER DIFFÉRENTES REQUÊTES SELECT
-- ============================================

-- Test 1: SELECT sans colonnes problématiques communes
SELECT
    id,
    order_number,
    customer_id,
    status,
    delivery_date,
    total_amount
FROM orders
LIMIT 1;

-- Test 2: SELECT avec toutes les colonnes de base
SELECT
    id,
    order_number,
    customer_id,
    status,
    delivery_date,
    delivery_time,
    total_amount,
    discount,
    advance,
    second_advance,
    remaining_amount,
    payment_type,
    needs_invoice,
    notes,
    created_at,
    updated_at
FROM orders
LIMIT 1;

-- Test 3: Vérifier si created_by cause problème
SELECT
    id,
    order_number,
    created_by
FROM orders
LIMIT 1;

-- Test 4: Vérifier si lab_delivery_hours cause problème
SELECT
    id,
    order_number,
    lab_delivery_hours
FROM orders
LIMIT 1;

-- ============================================
-- PARTIE 5: CORRIGER LES PROBLÈMES POTENTIELS
-- ============================================

-- Supprimer les colonnes qui pourraient être corrompues ou incompatibles
-- (commenté par sécurité - décommentez si nécessaire après avoir identifié le problème)

-- Recréer created_by proprement
ALTER TABLE orders DROP COLUMN IF EXISTS created_by CASCADE;
ALTER TABLE orders ADD COLUMN created_by VARCHAR(255);

-- Recréer lab_delivery_hours proprement
ALTER TABLE orders DROP COLUMN IF EXISTS lab_delivery_hours CASCADE;
ALTER TABLE orders ADD COLUMN lab_delivery_hours INTEGER DEFAULT 2;

-- ============================================
-- PARTIE 6: VÉRIFIER LES VUES MATÉRIALISÉES
-- ============================================

-- S'assurer qu'il n'y a pas de vues matérialisées qui interfèrent
SELECT
    schemaname,
    matviewname
FROM pg_matviews
WHERE schemaname = 'public';

-- ============================================
-- PARTIE 7: TEST FINAL
-- ============================================

-- Tester SELECT * après corrections
SELECT * FROM orders LIMIT 1;

-- Compter le total
SELECT COUNT(*) as total FROM orders;
