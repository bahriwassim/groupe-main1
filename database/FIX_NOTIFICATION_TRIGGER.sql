-- ============================================
-- FIX POUR LE TRIGGER DE NOTIFICATION
-- ============================================
-- Le trigger notify_order_created() utilise NEW.total
-- mais la colonne s'appelle total_amount, ce qui cause l'erreur 400

-- Recréer la fonction avec le bon nom de colonne
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
      'total_amount', NEW.total_amount  -- CORRECTION ICI: total -> total_amount
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Fonction notify_order_created() corrigée';
    RAISE NOTICE 'Le trigger utilisera maintenant total_amount au lieu de total';
END $$;
