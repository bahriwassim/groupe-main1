-- Vérifier dans quel schéma se trouve la table orders

-- 1. Trouver toutes les tables 'orders' dans tous les schémas
SELECT
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'orders';

-- 2. Vérifier RLS sur la table orders (tous schémas)
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'orders';

-- 3. Lister toutes les tables du schéma public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 4. Si orders est dans un autre schéma, désactiver RLS
DO $$
DECLARE
    schema_name text;
BEGIN
    -- Trouver le schéma de la table orders
    SELECT table_schema INTO schema_name
    FROM information_schema.tables
    WHERE table_name = 'orders'
    LIMIT 1;

    IF schema_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.orders DISABLE ROW LEVEL SECURITY', schema_name);
        EXECUTE format('ALTER TABLE %I.order_items DISABLE ROW LEVEL SECURITY', schema_name);
        EXECUTE format('ALTER TABLE %I.customers DISABLE ROW LEVEL SECURITY', schema_name);
        RAISE NOTICE 'RLS désactivé sur les tables du schéma: %', schema_name;
    END IF;
END $$;
