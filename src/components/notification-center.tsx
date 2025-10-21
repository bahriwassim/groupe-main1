'use client';

import { useState, useEffect } from 'react';
import { X, Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/use-notifications';
import { AnimatePresence, motion } from 'framer-motion';

export function NotificationCenter() {
  const { notifications, removeNotification, clearAll, unreadCount, markAsRead, refreshNotifications } = useNotifications();
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand quand nouvelle notification arrive
  useEffect(() => {
    if (notifications.length > 0) {
      setIsExpanded(true);
    }
  }, [notifications.length]);

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
      default:
        return '📋';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full px-4 pointer-events-none">
      <Card className="shadow-lg border-2 pointer-events-auto">
        <CardContent className="p-0">
          {/* Header toujours visible */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              {notifications.length > 0 ? (
                <BellRing className="w-5 h-5 text-blue-600 animate-pulse" />
              ) : (
                <Bell className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">
                Notifications
              </span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {unreadCount}
                </Badge>
              )}
              {notifications.length > unreadCount && (
                <Badge variant="secondary" className="ml-1">
                  {notifications.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAll();
                  }}
                  className="text-xs"
                >
                  Tout effacer
                </Button>
              )}
              <Button variant="ghost" size="sm">
                {isExpanded ? '▲' : '▼'}
              </Button>
            </div>
          </div>

          {/* Liste des notifications */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t"
              >
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ x: 300, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 300, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`p-4 border-b last:border-b-0 ${getNotificationColor(notification.type)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {notification.title}
                            </div>
                            <div className="text-sm opacity-90 mt-1">
                              {notification.message}
                            </div>
                            <div className="text-xs opacity-70 mt-2">
                              {notification.timestamp.toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {notification.notificationType && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await markAsRead(notification.id);
                                await refreshNotifications();
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Marquer lu
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeNotification(notification.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}