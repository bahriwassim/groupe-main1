-- ============================================
-- DÉSACTIVER TEMPORAIREMENT LE TRIGGER DE NOTIFICATION
-- ============================================
-- Utilisez ce script pour désactiver le trigger et tester la création de commande
-- Si la création fonctionne après, cela confirme que le trigger est la cause du problème

-- Désactiver le trigger
DROP TRIGGER IF EXISTS trigger_notify_order_created ON orders;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger trigger_notify_order_created désactivé';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Ce trigger est maintenant désactivé temporairement.';
    RAISE NOTICE '   Testez la création de commande maintenant.';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Si la création fonctionne:';
    RAISE NOTICE '   1. Le trigger était bien le problème';
    RAISE NOTICE '   2. Exécutez FIX_NOTIFICATION_TRIGGER.sql pour le corriger';
    RAISE NOTICE '   3. Puis réactivez-le avec ENABLE_NOTIFICATION_TRIGGER.sql';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Si la création ne fonctionne toujours pas:';
    RAISE NOTICE '   1. Le problème vient d''ailleurs';
    RAISE NOTICE '   2. Vérifiez les logs de la console du navigateur';
    RAISE NOTICE '   3. Réactivez le trigger avec ENABLE_NOTIFICATION_TRIGGER.sql';
END $$;

-- Vérifier que le trigger est bien supprimé
SELECT
    CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'trigger_notify_order_created'
        )
        THEN '✅ Trigger supprimé avec succès'
        ELSE '❌ Le trigger existe encore'
    END as status;
