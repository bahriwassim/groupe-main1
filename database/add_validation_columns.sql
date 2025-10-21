-- Script pour ajouter les colonnes de validation par produit dans production_order_items
-- Ce script ajoute les colonnes nécessaires pour le système de validation par produit

-- 1. Ajouter les colonnes de statut de validation si elles n'existent pas
DO $$
BEGIN
    -- Colonne pour le statut de validation production
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_order_items'
        AND column_name = 'production_status'
    ) THEN
        ALTER TABLE production_order_items
        ADD COLUMN production_status VARCHAR(20) DEFAULT 'pending'
        CHECK (production_status IN ('pending', 'approved', 'rejected'));

        COMMENT ON COLUMN production_order_items.production_status IS
        'Statut de validation par le service production: pending, approved, rejected';
    END IF;

    -- Colonne pour le statut de validation qualité
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_order_items'
        AND column_name = 'quality_status'
    ) THEN
        ALTER TABLE production_order_items
        ADD COLUMN quality_status VARCHAR(20) DEFAULT 'pending'
        CHECK (quality_status IN ('pending', 'approved', 'rejected'));

        COMMENT ON COLUMN production_order_items.quality_status IS
        'Statut de validation par le service qualité: pending, approved, rejected';
    END IF;

    -- Colonne pour la quantité produite
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_order_items'
        AND column_name = 'quantity_produced'
    ) THEN
        ALTER TABLE production_order_items
        ADD COLUMN quantity_produced INTEGER;

        COMMENT ON COLUMN production_order_items.quantity_produced IS
        'Quantité effectivement produite (peut différer de quantity_required)';
    END IF;

    -- Colonnes pour tracer la validation production
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_order_items'
        AND column_name = 'production_validated_at'
    ) THEN
        ALTER TABLE production_order_items
        ADD COLUMN production_validated_at TIMESTAMPTZ;

        COMMENT ON COLUMN production_order_items.production_validated_at IS
        'Date et heure de validation par le service production';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_order_items'
        AND column_name = 'production_validated_by'
    ) THEN
        ALTER TABLE production_order_items
        ADD COLUMN production_validated_by VARCHAR(255);

        COMMENT ON COLUMN production_order_items.production_validated_by IS
        'ID ou nom de l''utilisateur ayant validé pour la production';
    END IF;

    -- Colonnes pour tracer la validation qualité
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_order_items'
        AND column_name = 'quality_validated_at'
    ) THEN
        ALTER TABLE production_order_items
        ADD COLUMN quality_validated_at TIMESTAMPTZ;

        COMMENT ON COLUMN production_order_items.quality_validated_at IS
        'Date et heure de validation par le service qualité';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_order_items'
        AND column_name = 'quality_validated_by'
    ) THEN
        ALTER TABLE production_order_items
        ADD COLUMN quality_validated_by VARCHAR(255);

        COMMENT ON COLUMN production_order_items.quality_validated_by IS
        'ID ou nom de l''utilisateur ayant validé pour la qualité';
    END IF;

    -- Colonne pour les notes de validation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_order_items'
        AND column_name = 'validation_notes'
    ) THEN
        ALTER TABLE production_order_items
        ADD COLUMN validation_notes TEXT;

        COMMENT ON COLUMN production_order_items.validation_notes IS
        'Notes et commentaires sur les validations (production et qualité)';
    END IF;

    -- Colonne pour marquer si la production est terminée
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_order_items'
        AND column_name = 'production_completed'
    ) THEN
        ALTER TABLE production_order_items
        ADD COLUMN production_completed BOOLEAN DEFAULT FALSE;

        COMMENT ON COLUMN production_order_items.production_completed IS
        'Indique si la production de cet item est terminée';
    END IF;

END $$;

-- 2. Créer des index pour améliorer les performances des requêtes de validation
CREATE INDEX IF NOT EXISTS idx_production_order_items_production_status
ON production_order_items(production_status)
WHERE production_status != 'approved';

CREATE INDEX IF NOT EXISTS idx_production_order_items_quality_status
ON production_order_items(quality_status)
WHERE quality_status != 'approved';

CREATE INDEX IF NOT EXISTS idx_production_order_items_validation_tracking
ON production_order_items(production_order_id, production_status, quality_status);

-- 3. Fonction pour mettre à jour automatiquement le statut de l'ordre de production
-- basé sur les validations de ses items
CREATE OR REPLACE FUNCTION update_production_order_status_from_items()
RETURNS TRIGGER AS $$
DECLARE
    v_order_id UUID;
    v_total_items INTEGER;
    v_production_approved INTEGER;
    v_production_rejected INTEGER;
    v_quality_approved INTEGER;
    v_quality_rejected INTEGER;
    v_current_status VARCHAR(50);
BEGIN
    -- Récupérer l'ID de l'ordre de production
    v_order_id := COALESCE(NEW.production_order_id, OLD.production_order_id);

    IF v_order_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Compter les items et leurs statuts
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE production_status = 'approved'),
        COUNT(*) FILTER (WHERE production_status = 'rejected'),
        COUNT(*) FILTER (WHERE quality_status = 'approved'),
        COUNT(*) FILTER (WHERE quality_status = 'rejected')
    INTO
        v_total_items,
        v_production_approved,
        v_production_rejected,
        v_quality_approved,
        v_quality_rejected
    FROM production_order_items
    WHERE production_order_id = v_order_id;

    -- Récupérer le statut actuel de l'ordre
    SELECT status INTO v_current_status
    FROM production_orders
    WHERE id = v_order_id;

    -- Logique de mise à jour du statut
    -- Si tous les items production sont approuvés
    IF v_production_approved = v_total_items AND v_current_status IN ('cree', 'validation_production', 'non_conforme') THEN
        UPDATE production_orders
        SET status = 'production_validee', updated_at = NOW()
        WHERE id = v_order_id;

    -- Si au moins un item production est rejeté
    ELSIF v_production_rejected > 0 AND v_current_status IN ('cree', 'validation_production') THEN
        UPDATE production_orders
        SET status = 'non_conforme', updated_at = NOW()
        WHERE id = v_order_id;

    -- Si tous les items qualité sont approuvés
    ELSIF v_quality_approved = v_total_items AND v_current_status IN ('validation_qualite', 'production_validee') THEN
        UPDATE production_orders
        SET status = 'qualite_validee', updated_at = NOW()
        WHERE id = v_order_id;

    -- Si au moins un item qualité est rejeté
    ELSIF v_quality_rejected > 0 AND v_current_status = 'validation_qualite' THEN
        UPDATE production_orders
        SET status = 'non_conforme', updated_at = NOW()
        WHERE id = v_order_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Créer le trigger pour mettre à jour automatiquement le statut
DROP TRIGGER IF EXISTS trigger_update_production_order_status ON production_order_items;
CREATE TRIGGER trigger_update_production_order_status
    AFTER INSERT OR UPDATE OF production_status, quality_status ON production_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_production_order_status_from_items();

-- 5. Afficher un résumé des colonnes ajoutées
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'production_order_items'
    AND column_name IN (
        'production_status',
        'quality_status',
        'quantity_produced',
        'production_validated_at',
        'production_validated_by',
        'quality_validated_at',
        'quality_validated_by',
        'validation_notes',
        'production_completed'
    );

    RAISE NOTICE '✅ Script terminé. % colonnes de validation présentes dans production_order_items', v_count;
END $$;
