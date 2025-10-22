-- Script pour corriger l'accès à la table orders
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Vérifier si RLS est activé et le désactiver temporairement pour déboguer
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- 2. Si vous voulez activer RLS avec des policies permissives:
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Allow all access to orders" ON orders
--   FOR ALL
--   TO authenticated, anon
--   USING (true)
--   WITH CHECK (true);

-- 3. Vérifier que la colonne created_by existe (optionnel)
-- Si cette requête échoue, c'est que la colonne n'existe pas encore
-- SELECT created_by FROM orders LIMIT 1;

-- 4. Ajouter la colonne created_by si elle n'existe pas
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

COMMENT ON COLUMN orders.created_by IS 'Nom de l''utilisateur qui a créé la commande';
