-- ============================================
-- RÉACTIVER LE TRIGGER DE NOTIFICATION (VERSION CORRIGÉE)
-- ============================================
-- Ce script réactive le trigger avec la correction pour utiliser total_amount

-- D'abord, supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_notify_order_created ON orders;

-- Recréer la fonction avec la correction
CREATE OR REPLACE FUNCTION notify_order_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    type,
    title,
    message,
    severity,
    entity_type,
    entity_id,
    related_date,
    metadata
  )
  VALUES (
    'order_created',
    'Nouvelle commande créée',
    'Commande ' || NEW.order_number || ' créée pour le ' || TO_CHAR(NEW.delivery_date, 'DD/MM/YYYY'),
    'info',
    'order',
    NEW.id,
    NEW.delivery_date,
    jsonb_build_object(
      'order_number', NEW.order_number,
      'delivery_date', NEW.delivery_date,
      'total_amount', NEW.total_amount  -- ✅ CORRECTION: total -> total_amount
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
CREATE TRIGGER trigger_notify_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_created();

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger trigger_notify_order_created réactivé avec correction';
    RAISE NOTICE '';
    RAISE NOTICE 'Le trigger utilise maintenant NEW.total_amount au lieu de NEW.total';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Testez la création de commande maintenant.';
    RAISE NOTICE '   Les notifications devraient être créées correctement.';
END $$;

-- Vérifier que le trigger est bien créé
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'trigger_notify_order_created'
        )
        THEN '✅ Trigger actif'
        ELSE '❌ Trigger non trouvé'
    END as status;
