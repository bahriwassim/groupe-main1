-- SCRIPT POUR S'ASSURER QUE TOUTES LES COLONNES NÉCESSAIRES EXISTENT
-- Ce script ajoute les colonnes manquantes sans supprimer les existantes

-- ============================================
-- AJOUTER LES COLONNES MANQUANTES
-- ============================================

-- Colonnes de base
ALTER TABLE orders ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'en_attente';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(10);

-- Colonnes financières
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS second_advance DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10, 2) DEFAULT 0;

-- Autres colonnes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS needs_invoice BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Colonnes spéciales
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lab_delivery_hours INTEGER DEFAULT 2;

-- ============================================
-- VÉRIFIER LES COLONNES
-- ============================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- ============================================
-- TESTER LA REQUÊTE
-- ============================================

-- Test avec toutes les colonnes
SELECT
    id,
    order_number,
    customer_id,
    status,
    delivery_date,
    delivery_time,
    total_amount,
    discount,
    advance,
    second_advance,
    remaining_amount,
    payment_type,
    needs_invoice,
    notes,
    created_at,
    updated_at,
    created_by,
    lab_delivery_hours
FROM orders
LIMIT 5;
