import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { X, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import type { Notification } from '../../../server/src/schema';

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

export function NotificationPanel({ 
  notifications, 
  onMarkRead, 
  onMarkAllRead, 
  onClose 
}: NotificationPanelProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  return (
    <div className="absolute right-0 top-12 w-96 bg-white border shadow-lg rounded-lg z-50">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">
            Notifications 🔔
          </h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
              className="text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-96">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <p>No notifications yet</p>
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {notifications.map((notification: Notification) => (
              <Card
                key={notification.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                  !notification.read ? getTypeColor(notification.type) : 'bg-white'
                } ${!notification.read ? 'border-l-4' : ''}`}
                onClick={() => !notification.read && onMarkRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  {getTypeIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-medium ${
                        !notification.read ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${
                      !notification.read ? 'text-gray-700' : 'text-gray-500'
                    }`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">
                        {notification.created_at.toLocaleString()}
                      </p>
                      {notification.entity_type && (
                        <Badge variant="outline" className="text-xs">
                          {notification.entity_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}