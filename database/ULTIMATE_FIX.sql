-- SCRIPT ULTIME DE CORRECTION
-- Ce script force la désactivation de TOUT RLS et supprime TOUTES les policies

-- ============================================
-- PARTIE 1: DÉSACTIVER RLS SUR TOUTES LES TABLES
-- ============================================

-- Désactiver RLS sur toutes les tables du schéma public
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    )
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
        RAISE NOTICE 'RLS désactivé sur: %', r.tablename;
    END LOOP;
END $$;

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
        WHERE schemaname = 'public'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Policy supprimée: % sur %', r.policyname, r.tablename;
    END LOOP;
END $$;

-- ============================================
-- PARTIE 3: ACCORDER LES PERMISSIONS NÉCESSAIRES
-- ============================================

-- Accorder tous les droits sur les tables principales
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- PARTIE 4: VÉRIFICATIONS
-- ============================================

-- Vérifier que RLS est désactivé partout
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '❌ ENCORE ACTIVÉ!' ELSE '✅ Désactivé' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Vérifier qu'il n'y a plus de policies
SELECT
    COUNT(*) as policies_restantes,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ Aucune policy restrictive'
        ELSE '❌ Il reste des policies!'
    END as status
FROM pg_policies
WHERE schemaname = 'public';

-- Tester l'accès à la table orders
SELECT COUNT(*) as total_orders, '✅ Accès OK' as status FROM orders;

-- Message de confirmation finale
SELECT '✅✅✅ CONFIGURATION TERMINÉE - Toutes les tables sont maintenant accessibles ✅✅✅' as message;
