-- ============================================
-- FIX POUR L'ERREUR "order_id is ambiguous"
-- ============================================
-- Cette erreur se produit dans le trigger update_production_order_status_from_items()
-- lors de la validation d'un item de production

-- 1. D'abord, vérifier les colonnes des tables concernées
DO $$
BEGIN
    RAISE NOTICE '📊 Vérification des colonnes...';
END $$;

SELECT
    'production_orders' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'production_orders'
    AND column_name LIKE '%order%'
ORDER BY ordinal_position;

SELECT
    'production_order_items' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'production_order_items'
    AND column_name LIKE '%order%'
ORDER BY ordinal_position;

-- 2. Recréer le trigger en s'assurant qu'il n'y a pas d'ambiguïté
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
    -- Récupérer l'ID de l'ordre de production (QUALIFICATION EXPLICITE)
    v_order_id := COALESCE(NEW.production_order_id, OLD.production_order_id);

    IF v_order_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Compter les items et leurs statuts (QUALIFICATION EXPLICITE avec alias)
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE poi.production_status = 'approved'),
        COUNT(*) FILTER (WHERE poi.production_status = 'rejected'),
        COUNT(*) FILTER (WHERE poi.quality_status = 'approved'),
        COUNT(*) FILTER (WHERE poi.quality_status = 'rejected')
    INTO
        v_total_items,
        v_production_approved,
        v_production_rejected,
        v_quality_approved,
        v_quality_rejected
    FROM production_order_items poi
    WHERE poi.production_order_id = v_order_id;

    -- Récupérer le statut actuel de l'ordre (QUALIFICATION EXPLICITE avec alias)
    SELECT po.status INTO v_current_status
    FROM production_orders po
    WHERE po.id = v_order_id;

    -- Logique de mise à jour du statut
    -- Si tous les items production sont approuvés
    IF v_production_approved = v_total_items AND v_current_status IN ('cree', 'validation_production', 'non_conforme') THEN
        UPDATE production_orders po
        SET status = 'production_validee', updated_at = NOW()
        WHERE po.id = v_order_id;

    -- Si au moins un item production est rejeté
    ELSIF v_production_rejected > 0 AND v_current_status IN ('cree', 'validation_production') THEN
        UPDATE production_orders po
        SET status = 'non_conforme', updated_at = NOW()
        WHERE po.id = v_order_id;

    -- Si tous les items qualité sont approuvés
    ELSIF v_quality_approved = v_total_items AND v_current_status IN ('validation_qualite', 'production_validee') THEN
        UPDATE production_orders po
        SET status = 'qualite_validee', updated_at = NOW()
        WHERE po.id = v_order_id;

    -- Si au moins un item qualité est rejeté
    ELSIF v_quality_rejected > 0 AND v_current_status = 'validation_qualite' THEN
        UPDATE production_orders po
        SET status = 'non_conforme', updated_at = NOW()
        WHERE po.id = v_order_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Recréer le trigger
DROP TRIGGER IF EXISTS trigger_update_production_order_status ON production_order_items;
CREATE TRIGGER trigger_update_production_order_status
    AFTER INSERT OR UPDATE OF production_status, quality_status ON production_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_production_order_status_from_items();

-- 4. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger update_production_order_status_from_items() recréé avec qualification explicite des colonnes';
    RAISE NOTICE '✅ Plus d''ambiguïté sur order_id';
END $$;
