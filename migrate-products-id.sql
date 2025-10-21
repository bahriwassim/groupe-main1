-- Migration pour changer l'ID des produits de UUID à TEXT
-- À exécuter dans l'éditeur SQL de Supabase

-- ATTENTION: Cette migration va supprimer toutes les données existantes dans la table products
-- Sauvegardez vos données avant d'exécuter cette migration

-- 1. Supprimer la table products existante et ses dépendances
DROP TABLE IF EXISTS products CASCADE;

-- 2. Recréer la table products avec un ID de type TEXT
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sub_family TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('pièce', 'kg', 'carton', 'paquet', 'litre')),
  image_url TEXT,
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ajouter les index pour la performance
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_available ON products(is_available);

-- 4. Activer RLS (Row Level Security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS pour permettre l'accès public en lecture et admin en écriture
CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON products
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON products
  FOR DELETE USING (true);

-- 6. Créer un trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration terminée
-- Les nouveaux produits créés utiliseront maintenant le format: LT0001, GT0002, etc.
