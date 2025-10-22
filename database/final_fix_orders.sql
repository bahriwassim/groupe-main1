-- Script FINAL pour corriger tous les problèmes d'accès aux tables
-- Exécutez ce script dans Supabase SQL Editor

-- 1. DÉSACTIVER RLS sur TOUTES les tables
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sub_categories DISABLE ROW LEVEL SECURITY;

-- 2. SUPPRIMER toutes les policies existantes sur orders
DROP POLICY IF EXISTS "Allow all access to orders" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.orders;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.orders;

-- 3. VÉRIFIER que RLS est bien désactivé
SELECT
    schemaname,
    tablename,
    rowsecurity as "RLS_activé"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('orders', 'order_items', 'customers', 'products')
ORDER BY tablename;

-- 4. Ajouter la colonne created_by si elle n'existe pas
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- 5. Tester une requête simple
SELECT COUNT(*) as "Nombre de commandes" FROM public.orders;

-- 6. Vérifier les colonnes de la table orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- 7. Message de confirmation
SELECT 'Configuration terminée - RLS désactivé sur toutes les tables' as status;
