-- Script pour désactiver RLS sur les tables liées à orders
-- Exécutez ce script si vous avez toujours des erreurs 400

-- Désactiver RLS sur order_items
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur order_status_history (si elle existe)
ALTER TABLE order_status_history DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur customers
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Vérifier que tout fonctionne
SELECT 'orders' as table_name, COUNT(*) as count FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'customers', COUNT(*) FROM customers;
