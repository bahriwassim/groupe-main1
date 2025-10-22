-- Création de la table packs (ensembles de produits)
CREATE TABLE IF NOT EXISTS packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Création de la table pack_items (produits dans un pack)
CREATE TABLE IF NOT EXISTS pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_pack_items_pack_id ON pack_items(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_items_product_id ON pack_items(product_id);
CREATE INDEX IF NOT EXISTS idx_packs_is_active ON packs(is_active);

-- Commentaires pour documenter les tables
COMMENT ON TABLE packs IS 'Ensembles de produits (packs) vendus ensemble';
COMMENT ON TABLE pack_items IS 'Produits contenus dans chaque pack';
COMMENT ON COLUMN packs.total_price IS 'Prix total du pack (peut être différent de la somme des produits)';
COMMENT ON COLUMN packs.discount IS 'Réduction appliquée au pack';
COMMENT ON COLUMN packs.is_active IS 'Le pack est-il disponible à la vente';
COMMENT ON COLUMN pack_items.quantity IS 'Quantité du produit dans le pack';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà, puis le recréer
DROP TRIGGER IF EXISTS update_packs_updated_at_trigger ON packs;

CREATE TRIGGER update_packs_updated_at_trigger
BEFORE UPDATE ON packs
FOR EACH ROW
EXECUTE FUNCTION update_packs_updated_at();
