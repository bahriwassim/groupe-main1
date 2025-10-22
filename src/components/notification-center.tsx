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
    <div className="w-full">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-start relative"
      >
        {notifications.length > 0 ? (
          <BellRing className="w-5 h-5 text-blue-600 animate-pulse mr-2" />
        ) : (
          <Bell className="w-5 h-5 text-muted-foreground mr-2" />
        )}
        <span>Notifications</span>
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2">
              <Card className="shadow-sm border">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">Notifications</span>
                      {notifications.length > 0 && (
                        <Badge variant="secondary" className="h-5 text-xs">{notifications.length}</Badge>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="text-xs h-6"
                      >
                        Effacer
                      </Button>
                    )}
                  </div>

                  {/* Liste des notifications */}
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-2 border-b last:border-b-0 ${getNotificationColor(notification.type)}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-start gap-1.5 flex-1 min-w-0">
                              <span className="text-sm shrink-0">
                                {getNotificationIcon(notification.type)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs">
                                  {notification.title}
                                </div>
                                <div className="text-xs opacity-90 mt-0.5 line-clamp-2">
                                  {notification.message}
                                </div>
                                <div className="text-xs opacity-70 mt-0.5">
                                  {notification.timestamp.toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNotification(notification.id)}
                              className="shrink-0 h-5 w-5 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}