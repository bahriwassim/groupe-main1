'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { NotificationService, NotificationData } from '@/lib/notification-service';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: Date;
  autoClose?: boolean;
  entityType?: 'order' | 'production_order';
  entityId?: string;
  notificationType?: NotificationData['type'];
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  markAsRead: (id: string) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const deadlineCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remove après 5 secondes si autoClose est activé
    if (notification.autoClose !== false) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    // Si c'est une notification de la base de données, la marquer comme supprimée
    NotificationService.dismissNotification(id).catch(console.error);
  };

  const markAsRead = (id: string) => {
    NotificationService.markAsRead(id).catch(console.error);
  };

  const clearAll = () => {
    setNotifications([]);
    NotificationService.markAllAsRead().catch(console.error);
  };

  // Charger les notifications depuis la base de données
  const refreshNotifications = async () => {
    try {
      const dbNotifications = await NotificationService.getAllNotifications();
      const count = await NotificationService.getUnreadCount();

      setUnreadCount(count);

      // Convertir les notifications de la base de données au format local
      const localNotifications: Notification[] = dbNotifications.map(dbNotif => ({
        id: dbNotif.id,
        title: dbNotif.title,
        message: dbNotif.message,
        type: dbNotif.severity === 'warning' ? 'warning' :
              dbNotif.severity === 'error' ? 'error' :
              dbNotif.severity === 'success' ? 'success' : 'info',
        timestamp: dbNotif.createdAt,
        autoClose: dbNotif.type !== 'deadline_alert' && dbNotif.severity !== 'warning',
        entityType: dbNotif.entityType,
        entityId: dbNotif.entityId,
        notificationType: dbNotif.type,
      }));

      setNotifications(localNotifications);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  // Charger les notifications au démarrage
  useEffect(() => {
    refreshNotifications();
  }, []);

  // Vérifier les échéances toutes les 5 minutes
  useEffect(() => {
    // Vérification immédiate au démarrage
    NotificationService.checkDeadlineAlerts().catch(console.error);

    // Puis toutes les 5 minutes
    deadlineCheckInterval.current = setInterval(() => {
      NotificationService.checkDeadlineAlerts().catch(console.error);
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (deadlineCheckInterval.current) {
        clearInterval(deadlineCheckInterval.current);
      }
    };
  }, []);

  // Écouter les nouvelles notifications depuis la base de données
  useEffect(() => {
    const unsubscribe = NotificationService.subscribeToNotifications((dbNotif) => {
      console.log('📬 Nouvelle notification reçue:', dbNotif);

      const notification: Notification = {
        id: dbNotif.id,
        title: dbNotif.title,
        message: dbNotif.message,
        type: dbNotif.severity === 'warning' ? 'warning' :
              dbNotif.severity === 'error' ? 'error' :
              dbNotif.severity === 'success' ? 'success' : 'info',
        timestamp: dbNotif.createdAt,
        autoClose: dbNotif.type !== 'deadline_alert' && dbNotif.severity !== 'warning',
        entityType: dbNotif.entityType,
        entityId: dbNotif.entityId,
        notificationType: dbNotif.type,
      };

      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Son de notification pour les alertes importantes
      if (dbNotif.type === 'deadline_alert' || dbNotif.severity === 'warning') {
        // Jouer un son (optionnel)
        try {
          const audio = new Audio('/notification-sound.mp3');
          audio.play().catch(() => {
            // Ignorer les erreurs de lecture audio
          });
        } catch (e) {
          // Son non disponible
        }
      }
    });

    return unsubscribe;
  }, []);

  // Écouter les changements en temps réel des ordres de production (comportement legacy)
  useEffect(() => {
    const channel = supabase
      .channel('production_orders_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'production_orders'
        },
        (payload) => {
          console.log('🔄 Ordre de production mis à jour:', payload);

          // Notifier seulement les changements de statut importants
          if (payload.old.status !== payload.new.status) {
            const statusMessages = {
              'validation_production': '⏳ En attente de validation production',
              'production_validee': '✅ Production validée',
              'validation_qualite': '🔍 En attente de validation qualité',
              'qualite_validee': '✅ Qualité validée',
              'non_conforme': '❌ Non conforme - action requise',
              'en_fabrication': '🏭 Production en cours',
              'production_terminee': '✅ Production terminée',
              'termine': '🎉 Ordre terminé'
            };

            const statusMessage = statusMessages[payload.new.status as keyof typeof statusMessages];
            if (statusMessage) {
              addNotification({
                title: `📋 ${payload.new.order_number}`,
                message: statusMessage,
                type: payload.new.status === 'non_conforme' ? 'warning' : 'info',
                autoClose: payload.new.status !== 'non_conforme'
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🔄 Commande mise à jour:', payload);

          // Notifier les changements de statut importants
          if (payload.old.status !== payload.new.status) {
            addNotification({
              title: `📦 Commande ${payload.new.order_number}`,
              message: `Statut changé: ${payload.new.status}`,
              type: 'info',
              autoClose: true
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      removeNotification,
      clearAll,
      markAsRead,
      refreshNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};