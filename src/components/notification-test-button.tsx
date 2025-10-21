'use client';

import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell } from 'lucide-react';

export function NotificationTestButton() {
  const { addNotification } = useNotifications();

  const testNotifications = () => {
    // Test 1: Notification info
    addNotification({
      title: 'Test - Nouvelle commande',
      message: 'Commande BC-2025-001 créée avec succès',
      type: 'info',
      autoClose: false,
    });

    // Test 2: Notification warning après 1 seconde
    setTimeout(() => {
      addNotification({
        title: 'Test - Alerte échéance',
        message: 'La commande BC-2025-001 arrive à échéance dans 30 minutes!',
        type: 'warning',
        autoClose: false,
      });
    }, 1000);

    // Test 3: Notification success après 2 secondes
    setTimeout(() => {
      addNotification({
        title: 'Test - Validation réussie',
        message: 'L\'ordre de fabrication OF-2025-001 a été validé',
        type: 'success',
        autoClose: true,
      });
    }, 2000);

    // Test 4: Notification error après 3 secondes
    setTimeout(() => {
      addNotification({
        title: 'Test - Erreur',
        message: 'Une erreur est survenue lors du traitement',
        type: 'error',
        autoClose: false,
      });
    }, 3000);
  };

  return (
    <Button
      onClick={testNotifications}
      variant="outline"
      size="sm"
      className="fixed bottom-4 right-4 z-50 shadow-lg"
    >
      <Bell className="mr-2 h-4 w-4" />
      Tester Notifications
    </Button>
  );
}
