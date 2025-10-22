-- Vérifier les types de colonnes *validated_by
SELECT
    table_name,
    column_name,
    data_type,
    udt_name,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('production_order_items', 'production_orders', 'orders')
AND column_name LIKE '%validated_by%'
OR column_name = 'created_by'
ORDER BY table_name, column_name;
