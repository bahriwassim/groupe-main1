# Système de Notifications - Guide Complet

## Vue d'ensemble

Le système de notifications fournit des alertes en temps réel pour les événements importants liés aux commandes et ordres de fabrication. Il comprend :

- Notifications de création de commandes et ordres de fabrication
- Alarmes automatiques 30 minutes avant les échéances
- Notifications de changements de statut
- Interface utilisateur interactive
- Stockage persistant dans Supabase

## Architecture

### 1. Base de données (Supabase)

**Fichier**: `database/notifications.sql`

#### Table `notifications`

Stocke toutes les notifications du système avec les colonnes suivantes:

- `id`: UUID unique
- `type`: Type de notification (`order_created`, `production_created`, `deadline_alert`, `status_change`)
- `title`: Titre de la notification
- `message`: Message détaillé
- `severity`: Niveau de gravité (`info`, `warning`, `error`, `success`)
- `entity_type`: Type d'entité (`order`, `production_order`)
- `entity_id`: ID de l'entité concernée
- `related_date`: Date de l'événement
- `is_read`: Marqueur de lecture
- `is_dismissed`: Marqueur de suppression
- `created_at`: Date de création
- `expires_at`: Date d'expiration (optionnel)
- `metadata`: Données JSON supplémentaires

#### Fonctions PostgreSQL

**`notify_order_created()`**
- Trigger automatique lors de la création d'une commande
- Crée une notification de type `order_created`

**`notify_production_order_created()`**
- Trigger automatique lors de la création d'un ordre de fabrication
- Crée une notification de type `production_created`

**`check_deadline_alerts()`**
- Fonction à exécuter périodiquement (toutes les 5 minutes)
- Vérifie les commandes et ordres de fabrication arrivant à échéance dans 30 minutes
- Crée des notifications de type `deadline_alert` avec severity `warning`
- Évite les doublons en vérifiant qu'aucune alerte n'a été créée dans la dernière heure

**`cleanup_old_notifications()`**
- Fonction de nettoyage à exécuter quotidiennement
- Supprime les notifications lues de plus de 7 jours
- Supprime les notifications non lues de plus de 30 jours

### 2. Service de Notifications

**Fichier**: `src/lib/notification-service.ts`

Classe `NotificationService` qui fournit les méthodes suivantes:

#### Récupération
- `getUnreadNotifications()`: Récupère toutes les notifications non lues
- `getAllNotifications(limit)`: Récupère toutes les notifications (par défaut 50)
- `getNotificationsByType(type)`: Filtre par type de notification
- `getNotificationsByEntity(entityType, entityId)`: Notifications pour une entité spécifique
- `getUnreadCount()`: Compte le nombre de notifications non lues

#### Actions
- `markAsRead(notificationId)`: Marque une notification comme lue
- `markAllAsRead()`: Marque toutes les notifications comme lues
- `dismissNotification(notificationId)`: Supprime une notification
- `createNotification(data)`: Crée une notification manuellement

#### Maintenance
- `checkDeadlineAlerts()`: Lance la vérification des échéances
- `cleanupOldNotifications()`: Nettoie les anciennes notifications

#### Temps réel
- `subscribeToNotifications(callback)`: S'abonne aux nouvelles notifications via Supabase Realtime

### 3. Hook React

**Fichier**: `src/hooks/use-notifications.tsx`

Hook `useNotifications()` qui fournit:

#### État
- `notifications`: Liste des notifications actives
- `unreadCount`: Nombre de notifications non lues

#### Actions
- `addNotification(notification)`: Ajoute une notification locale
- `removeNotification(id)`: Supprime une notification
- `clearAll()`: Efface toutes les notifications
- `markAsRead(id)`: Marque comme lue
- `refreshNotifications()`: Recharge les notifications depuis la base

#### Fonctionnalités automatiques
- Chargement initial des notifications
- Vérification des échéances toutes les 5 minutes
- Écoute en temps réel des nouvelles notifications
- Écoute des changements de statut (commandes et ordres de production)
- Son d'alerte pour les notifications importantes (optionnel)

### 4. Interface Utilisateur

**Fichier**: `src/components/notification-center.tsx`

Composant `NotificationCenter` qui affiche:

- Badge avec le nombre de notifications non lues (rouge)
- Badge avec le nombre total de notifications (gris)
- Liste dépliable des notifications
- Animations d'entrée/sortie
- Boutons d'action:
  - "Marquer lu" pour les notifications persistantes
  - "X" pour supprimer
  - "Tout effacer" pour nettoyer toutes les notifications
- Couleurs selon la gravité:
  - Bleu: Info
  - Vert: Succès
  - Orange: Avertissement
  - Rouge: Erreur

## Installation et Configuration

### 1. Exécuter le script SQL

Connectez-vous à votre base Supabase et exécutez le fichier `database/notifications.sql`:

```bash
# Via le tableau de bord Supabase
# SQL Editor > New Query > Collez le contenu du fichier > Run
```

### 2. Configurer le CRON pour les alarmes

Pour vérifier automatiquement les échéances toutes les 5 minutes, vous avez deux options:

#### Option A: CRON Supabase (Recommandé)

Créez un Edge Function ou utilisez pg_cron:

```sql
-- Si pg_cron est disponible
SELECT cron.schedule(
  'check-deadline-alerts',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$SELECT check_deadline_alerts();$$
);
```

#### Option B: Service externe

Configurez un service comme Vercel Cron ou GitHub Actions:

```yaml
# .github/workflows/check-alerts.yml
name: Check Deadline Alerts
on:
  schedule:
    - cron: '*/5 * * * *' # Toutes les 5 minutes

jobs:
  check-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase function
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/rest/v1/rpc/check_deadline_alerts' \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

### 3. Intégrer le NotificationCenter

Le composant est déjà intégré dans `src/app/layout.tsx` via le `NotificationProvider`.

Si ce n'est pas le cas, ajoutez-le:

```tsx
import { NotificationProvider } from '@/hooks/use-notifications';
import { NotificationCenter } from '@/components/notification-center';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NotificationProvider>
          <NotificationCenter />
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
```

## Utilisation

### Dans un composant React

```tsx
import { useNotifications } from '@/hooks/use-notifications';

function MyComponent() {
  const { addNotification, notifications, unreadCount } = useNotifications();

  const handleAction = () => {
    addNotification({
      title: 'Action réussie',
      message: 'L\'opération s\'est terminée avec succès',
      type: 'success',
      autoClose: true // Fermeture automatique après 5 secondes
    });
  };

  return (
    <div>
      <p>Notifications non lues: {unreadCount}</p>
      <button onClick={handleAction}>Effectuer une action</button>
    </div>
  );
}
```

### Créer une notification manuellement

```tsx
import { NotificationService } from '@/lib/notification-service';

// Créer une notification personnalisée
await NotificationService.createNotification({
  type: 'status_change',
  title: 'Statut mis à jour',
  message: 'La commande a été validée',
  severity: 'success',
  entityType: 'order',
  entityId: 'order-id-123',
  relatedDate: new Date(),
  metadata: {
    order_number: 'BC-2025-001',
    old_status: 'Saisi',
    new_status: 'Validé'
  }
});
```

### Vérifier manuellement les échéances

```tsx
import { NotificationService } from '@/lib/notification-service';

// Forcer une vérification des échéances
await NotificationService.checkDeadlineAlerts();
```

## Types de notifications

### 1. Création de commande (`order_created`)
- **Trigger**: Automatique lors de l'insertion dans `orders`
- **Severity**: `info`
- **AutoClose**: Non
- **Contenu**: Numéro de commande, date de livraison, montant total

### 2. Création d'ordre de fabrication (`production_created`)
- **Trigger**: Automatique lors de l'insertion dans `production_orders`
- **Severity**: `info`
- **AutoClose**: Non
- **Contenu**: Numéro d'ordre, laboratoire, date de production

### 3. Alerte d'échéance (`deadline_alert`)
- **Trigger**: Vérification périodique (toutes les 5 minutes)
- **Severity**: `warning`
- **AutoClose**: Non
- **Contenu**: Type d'entité, échéance, temps restant
- **Condition**: 30 minutes avant l'échéance

### 4. Changement de statut (`status_change`)
- **Trigger**: Écoute temps réel des UPDATE
- **Severity**: Variable selon le nouveau statut
- **AutoClose**: Oui (sauf pour les statuts critiques)
- **Contenu**: Numéro d'entité, ancien et nouveau statut

## Maintenance

### Nettoyage quotidien

Configurez un CRON pour nettoyer les anciennes notifications:

```sql
SELECT cron.schedule(
  'cleanup-notifications',
  '0 2 * * *', -- Tous les jours à 2h du matin
  $$SELECT cleanup_old_notifications();$$
);
```

### Monitoring

Vérifiez régulièrement:

```sql
-- Nombre de notifications par type
SELECT type, COUNT(*), severity
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type, severity
ORDER BY COUNT(*) DESC;

-- Notifications non lues anciennes
SELECT id, title, created_at, type
FROM notifications
WHERE is_read = FALSE
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Personnalisation

### Modifier le délai d'alerte

Par défaut: 30 minutes. Pour changer:

```sql
-- Dans la fonction check_deadline_alerts()
-- Modifier la ligne:
alert_threshold INTERVAL := '30 minutes';
-- Par exemple, pour 1 heure:
alert_threshold INTERVAL := '1 hour';
```

### Ajouter un son de notification

Placez un fichier `notification-sound.mp3` dans le dossier `public/`:

```bash
public/
  └── notification-sound.mp3
```

Le hook `use-notifications.tsx` tentera automatiquement de le jouer pour les alertes importantes.

### Personnaliser les couleurs

Modifiez le composant `NotificationCenter.tsx`:

```tsx
const getNotificationColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-800'; // Personnalisez ici
    // ...
  }
};
```

## Dépannage

### Les notifications ne s'affichent pas

1. Vérifiez que le SQL a été exécuté correctement
2. Vérifiez les logs de la console
3. Vérifiez les permissions RLS dans Supabase
4. Vérifiez que le `NotificationProvider` entoure bien votre application

### Les alarmes ne sont pas créées

1. Vérifiez que le CRON est configuré
2. Exécutez manuellement `SELECT check_deadline_alerts();`
3. Vérifiez les dates dans vos commandes/ordres
4. Vérifiez les logs de la fonction

### Notifications en double

1. La fonction `check_deadline_alerts()` vérifie déjà les doublons (1 heure)
2. Si problème persiste, ajustez la fenêtre de vérification dans le SQL

### Performance

Si vous avez beaucoup de notifications:

1. Augmentez la fréquence de nettoyage
2. Réduisez la limite dans `getAllNotifications()`
3. Ajoutez des index supplémentaires si nécessaire

## Roadmap / Améliorations futures

- [ ] Notifications push navigateur (Web Push API)
- [ ] Filtres par type de notification
- [ ] Paramètres utilisateur (activer/désactiver certains types)
- [ ] Email pour les alertes critiques
- [ ] Statistiques et rapports de notifications
- [ ] Notifications groupées par entité
- [ ] Actions rapides depuis les notifications (approuver, rejeter, etc.)

## Support

Pour toute question ou problème, consultez:
- La documentation Supabase Realtime: https://supabase.com/docs/guides/realtime
- Les logs de développement dans la console navigateur
- Les logs PostgreSQL dans le tableau de bord Supabase
