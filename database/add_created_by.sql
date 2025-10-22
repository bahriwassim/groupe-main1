-- Ajouter le champ created_by aux commandes
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN orders.created_by IS 'Nom de l''utilisateur qui a créé la commande';

-- Mettre à jour les types TypeScript si nécessaire
-- Le champ stockera le nom de l'utilisateur (ex: "Admin User", "Sales User")
