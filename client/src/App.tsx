import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, ClipboardList, Package, Archive, Users, Plus } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Notification } from '../../server/src/schema';

// Import feature components
import { TasksTab } from '@/components/TasksTab';
import { ProductsTab } from '@/components/ProductsTab';
import { InventoryTab } from '@/components/InventoryTab';
import { CustomersTab } from '@/components/CustomersTab';
import { NotificationPanel } from '@/components/NotificationPanel';

function App() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  const loadNotifications = useCallback(async () => {
    try {
      const [notificationsData, countData] = await Promise.all([
        trpc.getNotifications.query(),
        trpc.getUnreadNotificationsCount.query()
      ]);
      setNotifications(notificationsData);
      setUnreadCount(countData);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await trpc.markAllNotificationsRead.mutate();
      setUnreadCount(0);
      setNotifications((prev: Notification[]) =>
        prev.map((notif: Notification) => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await trpc.markNotificationRead.mutate({ id });
      setNotifications((prev: Notification[]) =>
        prev.map((notif: Notification) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  Management App 📋
                </h1>
              </div>
            </div>
            
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              
              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={handleMarkAllRead}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger 
              value="tasks" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <ClipboardList className="h-4 w-4" />
              Tasks ✅
            </TabsTrigger>
            <TabsTrigger 
              value="products"
              className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
            >
              <Package className="h-4 w-4" />
              Products 📦
            </TabsTrigger>
            <TabsTrigger 
              value="inventory"
              className="flex items-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700"
            >
              <Archive className="h-4 w-4" />
              Inventory 📊
            </TabsTrigger>
            <TabsTrigger 
              value="customers"
              className="flex items-center gap-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700"
            >
              <Users className="h-4 w-4" />
              Customers 👥
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            <TasksTab />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryTab />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomersTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;