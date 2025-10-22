-- Script de diagnostic pour vérifier le trigger

-- 1. Vérifier si le trigger existe
SELECT
    tgname AS trigger_name,
    tgenabled AS enabled,
    tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname = 'trigger_update_production_order_status'
AND tgisinternal = false;

-- 2. Afficher la définition complète de la fonction
SELECT pg_get_functiondef('update_production_order_status_from_items'::regproc);

-- 3. Vérifier quand la fonction a été modifiée pour la dernière fois
SELECT
    p.proname AS function_name,
    p.prosrc AS source_code
FROM pg_proc p
WHERE p.proname = 'update_production_order_status_from_items';
