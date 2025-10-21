import { supabase } from './supabase-client';

export interface NotificationData {
  id: string;
  type: 'order_created' | 'production_created' | 'deadline_alert' | 'status_change';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  entityType?: 'order' | 'production_order';
  entityId?: string;
  relatedDate?: Date;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Service pour gérer les notifications du système
 */
export class NotificationService {
  /**
   * Récupérer toutes les notifications non lues
   */
  static async getUnreadNotifications(): Promise<NotificationData[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      return [];
    }

    return data?.map(this.mapNotification) || [];
  }

  /**
   * Récupérer toutes les notifications (lues et non lues)
   */
  static async getAllNotifications(limit = 50): Promise<NotificationData[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      return [];
    }

    return data?.map(this.mapNotification) || [];
  }

  /**
   * Marquer une notification comme lue
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Erreur lors du marquage de la notification:', error);
      return false;
    }

    return true;
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  static async markAllAsRead(): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) {
      console.error('Erreur lors du marquage des notifications:', error);
      return false;
    }

    return true;
  }

  /**
   * Supprimer (dismiss) une notification
   */
  static async dismissNotification(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_dismissed: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
      return false;
    }

    return true;
  }

  /**
   * Créer une notification manuellement
   */
  static async createNotification(notification: Omit<NotificationData, 'id' | 'isRead' | 'isDismissed' | 'createdAt'>): Promise<NotificationData | null> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        severity: notification.severity,
        entity_type: notification.entityType,
        entity_id: notification.entityId,
        related_date: notification.relatedDate,
        expires_at: notification.expiresAt,
        metadata: notification.metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création de la notification:', error);
      return null;
    }

    return this.mapNotification(data);
  }

  /**
   * Vérifier les échéances et créer des alarmes (fonction à appeler périodiquement)
   */
  static async checkDeadlineAlerts(): Promise<void> {
    const { error } = await supabase.rpc('check_deadline_alerts');

    if (error) {
      console.error('Erreur lors de la vérification des échéances:', error);
    }
  }

  /**
   * Nettoyer les anciennes notifications
   */
  static async cleanupOldNotifications(): Promise<void> {
    const { error } = await supabase.rpc('cleanup_old_notifications');

    if (error) {
      console.error('Erreur lors du nettoyage des notifications:', error);
    }
  }

  /**
   * S'abonner aux changements de notifications en temps réel
   */
  static subscribeToNotifications(callback: (notification: NotificationData) => void) {
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const notification = this.mapNotification(payload.new);
          callback(notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Mapper les données de la base de données vers le type NotificationData
   */
  private static mapNotification(data: any): NotificationData {
    return {
      id: data.id,
      type: data.type,
      title: data.title,
      message: data.message,
      severity: data.severity,
      entityType: data.entity_type,
      entityId: data.entity_id,
      relatedDate: data.related_date ? new Date(data.related_date) : undefined,
      isRead: data.is_read,
      isDismissed: data.is_dismissed,
      createdAt: new Date(data.created_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      metadata: data.metadata,
    };
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  static async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_dismissed', false);

    if (error) {
      console.error('Erreur lors du comptage des notifications:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Obtenir les notifications d'un type spécifique
   */
  static async getNotificationsByType(type: NotificationData['type']): Promise<NotificationData[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', type)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      return [];
    }

    return data?.map(this.mapNotification) || [];
  }

  /**
   * Obtenir les notifications liées à une entité spécifique
   */
  static async getNotificationsByEntity(entityType: 'order' | 'production_order', entityId: string): Promise<NotificationData[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      return [];
    }

    return data?.map(this.mapNotification) || [];
  }
}
