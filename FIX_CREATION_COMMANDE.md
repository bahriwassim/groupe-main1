# Fix Rapide - Erreur "Aucune commande retournée"

## Diagnostic

L'erreur "aucune commande retournée" indique que l'insertion dans la base de données échoue, probablement à cause du trigger `notify_order_created()` qui utilise un nom de colonne incorrect.

## Solution Rapide (2 étapes)

### Étape 1: Désactiver temporairement le trigger

1. Allez sur: https://supabase.com/dashboard/project/lcyevhpexzcrmbfozqwt/sql/new

2. Copiez et exécutez le contenu de: `database/DISABLE_NOTIFICATION_TRIGGER.sql`

**OU** copiez-collez ce SQL:
```sql
DROP TRIGGER IF EXISTS trigger_notify_order_created ON orders;
```

3. Testez la création d'une commande dans l'interface

### Étape 2a: Si ça fonctionne

Le trigger était bien le problème. Réactivez-le avec la correction:

1. Allez sur: https://supabase.com/dashboard/project/lcyevhpexzcrmbfozqwt/sql/new

2. Copiez et exécutez le contenu de: `database/ENABLE_NOTIFICATION_TRIGGER.sql`

**OU** copiez-collez ce SQL:
```sql
-- Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS trigger_notify_order_created ON orders;

-- Recréer la fonction corrigée
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
      'total_amount', NEW.total_amount
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
```

3. Testez à nouveau la création de commande

### Étape 2b: Si ça ne fonctionne toujours pas

Le problème vient d'ailleurs. Vérifiez:

1. Ouvrez la console du navigateur (F12)
2. Regardez les logs d'erreur (commencent par ❌❌❌)
3. Notez le message d'erreur, le code et les détails
4. Réactivez le trigger avec `database/ENABLE_NOTIFICATION_TRIGGER.sql`

## Logs à Vérifier

Après avoir essayé de créer une commande, ouvrez la console du navigateur et cherchez:

```
🔍 Création commande avec données: {...}
```

Puis cherchez les erreurs:
```
❌❌❌ ERREUR lors de la création de la commande
Message: ...
Code: ...
Details: ...
Hint: ...
```

## Problème Connu

Le trigger `notify_order_created()` dans `database/notifications.sql:75` utilise:
```sql
'total', NEW.total  -- ❌ Cette colonne n'existe pas
```

Mais la colonne s'appelle `total_amount` dans la table `orders`. La correction change:
```sql
'total_amount', NEW.total_amount  -- ✅ Correct
```

## Vérification Rapide

Pour vérifier si le trigger est actif:
```sql
SELECT
    tgname as trigger_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_notify_order_created';
```

Résultats:
- Si aucun résultat: trigger désactivé
- Si `enabled = 'O'`: trigger actif
- Si `enabled = 'D'`: trigger désactivé

## Commandes Utiles

```bash
# Redémarrer le serveur dev
npm run dev

# Vérifier les erreurs TypeScript
npm run typecheck

# Builder le projet
npm run build
```

## Fichiers SQL Disponibles

- `database/DISABLE_NOTIFICATION_TRIGGER.sql` - Désactive le trigger
- `database/ENABLE_NOTIFICATION_TRIGGER.sql` - Réactive le trigger (version corrigée)
- `database/FIX_NOTIFICATION_TRIGGER.sql` - Correction simple
- `database/FIX_ORDER_CREATION_400.sql` - Fix complet (plus invasif)

## Support

Si le problème persiste après ces étapes:
1. Partagez les logs de la console (section ❌❌❌)
2. Partagez le résultat de la requête SQL de vérification ci-dessus
3. Vérifiez que les colonnes de la table `orders` existent avec:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'orders'
   ORDER BY ordinal_position;
   ```
