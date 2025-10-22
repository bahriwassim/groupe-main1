-- Table pour stocker les notifications persistantes
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'order_created', 'production_created', 'deadline_alert', 'status_change'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  entity_type VARCHAR(50), -- 'order', 'production_order'
  entity_id UUID, -- ID de l'entité concernée
  related_date TIMESTAMPTZ, -- Date de la commande/ordre de fabrication
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Date d'expiration de la notification
  metadata JSONB -- Données supplémentaires (order_number, etc.)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_related_date ON notifications(related_date) WHERE related_date IS NOT NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Politique RLS - Tous les utilisateurs authentifiés peuvent voir toutes les notifications
CREATE POLICY "Users can view all notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique RLS - Le système peut créer des notifications
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique RLS - Les utilisateurs peuvent marquer les notifications comme lues
CREATE POLICY "Users can update notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour créer une notification lors de la création d'une commande
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
      'total', NEW.total
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une notification lors de la création d'un ordre de fabrication
CREATE OR REPLACE FUNCTION notify_production_order_created()
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
    'production_created',
    'Nouvel ordre de fabrication',
    'Ordre ' || NEW.order_number || ' créé - ' || NEW.laboratory,
    'info',
    'production_order',
    NEW.id,
    COALESCE(NEW.delivery_date, NEW.scheduled_start),
    jsonb_build_object(
      'order_number', NEW.order_number,
      'laboratory', NEW.laboratory,
      'delivery_date', NEW.delivery_date,
      'scheduled_start', NEW.scheduled_start
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour la création automatique de notifications
DROP TRIGGER IF EXISTS trigger_notify_order_created ON orders;
CREATE TRIGGER trigger_notify_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_created();

DROP TRIGGER IF EXISTS trigger_notify_production_order_created ON production_orders;
CREATE TRIGGER trigger_notify_production_order_created
  AFTER INSERT ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_production_order_created();

-- Fonction pour vérifier les dates d'échéance et créer des alarmes
CREATE OR REPLACE FUNCTION check_deadline_alerts()
RETURNS void AS $$
DECLARE
  alert_threshold INTERVAL := '30 minutes';
  order_rec RECORD;
  production_rec RECORD;
BEGIN
  -- Vérifier les commandes qui arrivent à échéance dans 30 minutes
  FOR order_rec IN
    SELECT o.id, o.order_number, o.delivery_date, o.delivery_time
    FROM orders o
    WHERE o.status NOT IN ('Terminé', 'Annulé', 'termine')
      AND o.delivery_date IS NOT NULL
      -- Vérifier si la date de livraison est dans 30 minutes
      AND (
        CASE
          WHEN o.delivery_time IS NOT NULL THEN
            (o.delivery_date::date + o.delivery_time::time) BETWEEN NOW() AND (NOW() + alert_threshold)
          ELSE
            o.delivery_date BETWEEN NOW() AND (NOW() + alert_threshold)
        END
      )
      -- Vérifier qu'on n'a pas déjà créé d'alerte pour cette commande
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.entity_type = 'order'
          AND n.entity_id = o.id
          AND n.type = 'deadline_alert'
          AND n.created_at > NOW() - INTERVAL '1 hour'
      )
  LOOP
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
      'deadline_alert',
      'Commande bientôt due',
      'La commande ' || order_rec.order_number || ' doit être livrée dans moins de 30 minutes!',
      'warning',
      'order',
      order_rec.id,
      order_rec.delivery_date,
      jsonb_build_object(
        'order_number', order_rec.order_number,
        'delivery_date', order_rec.delivery_date,
        'delivery_time', order_rec.delivery_time
      )
    );
  END LOOP;

  -- Vérifier les ordres de fabrication qui arrivent à échéance dans 30 minutes
  FOR production_rec IN
    SELECT p.id, p.order_number, COALESCE(p.delivery_date, p.scheduled_start) as production_date, p.laboratory
    FROM production_orders p
    WHERE p.status NOT IN ('termine', 'annule')
      AND COALESCE(p.delivery_date, p.scheduled_start) IS NOT NULL
      AND COALESCE(p.delivery_date, p.scheduled_start) BETWEEN NOW() AND (NOW() + alert_threshold)
      -- Vérifier qu'on n'a pas déjà créé d'alerte pour cet ordre
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.entity_type = 'production_order'
          AND n.entity_id = p.id
          AND n.type = 'deadline_alert'
          AND n.created_at > NOW() - INTERVAL '1 hour'
      )
  LOOP
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
      'deadline_alert',
      'Ordre de fabrication urgent',
      'L''ordre ' || production_rec.order_number || ' (' || production_rec.laboratory || ') doit être terminé dans moins de 30 minutes!',
      'warning',
      'production_order',
      production_rec.id,
      production_rec.production_date,
      jsonb_build_object(
        'order_number', production_rec.order_number,
        'laboratory', production_rec.laboratory,
        'delivery_date', production_rec.production_date
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les anciennes notifications (à exécuter périodiquement)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Supprimer les notifications lues et expirées de plus de 7 jours
  DELETE FROM notifications
  WHERE is_read = TRUE
    AND created_at < NOW() - INTERVAL '7 days';

  -- Supprimer les notifications non lues de plus de 30 jours
  DELETE FROM notifications
  WHERE is_read = FALSE
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour la documentation
COMMENT ON TABLE notifications IS 'Table pour stocker les notifications du système (commandes, ordres de fabrication, alertes)';
COMMENT ON COLUMN notifications.type IS 'Type de notification: order_created, production_created, deadline_alert, status_change';
COMMENT ON COLUMN notifications.severity IS 'Niveau de gravité: info, warning, error, success';
COMMENT ON COLUMN notifications.entity_type IS 'Type d''entité concernée: order, production_order';
COMMENT ON COLUMN notifications.related_date IS 'Date de l''événement (delivery_date pour commandes, delivery_date/scheduled_start pour ordres de fabrication)';
COMMENT ON FUNCTION check_deadline_alerts() IS 'Fonction à exécuter périodiquement (toutes les 5-10 minutes) pour vérifier les échéances à venir';
COMMENT ON FUNCTION cleanup_old_notifications() IS 'Fonction à exécuter quotidiennement pour nettoyer les anciennes notifications';
