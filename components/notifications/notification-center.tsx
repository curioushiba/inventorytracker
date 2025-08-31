'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, BellOff, Settings, Trash2, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useRichNotifications } from '@/hooks/use-rich-notifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const {
    state,
    actions: { requestPermission, markAsRead, clearHistory, handleNotificationAction },
    templates: { sendLowStockAlert, sendCriticalStockAlert },
    utils: { getStockAlertSummary, isPermissionGranted, formatTimestamp, getPriorityColor }
  } = useRichNotifications();

  const [selectedTab, setSelectedTab] = useState('all');

  const handlePermissionRequest = async () => {
    try {
      const permission = await requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission is required for stock alerts and updates.');
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all notification history?')) {
      await clearHistory();
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.data?.read) {
      await handleMarkAsRead(notification.id);
    }

    // Handle default action (usually first action)
    if (notification.actions && notification.actions.length > 0) {
      const defaultAction = notification.actions[0];
      await handleNotificationAction(defaultAction.action, notification.data);
    }
  };

  const getFilteredNotifications = (filter: string) => {
    let filtered = state.history;

    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.data?.read);
        break;
      case 'stock':
        filtered = filtered.filter(n => n.category === 'stock');
        break;
      case 'sync':
        filtered = filtered.filter(n => n.category === 'sync');
        break;
      case 'system':
        filtered = filtered.filter(n => n.category === 'system');
        break;
      default:
        // Show all
        break;
    }

    return filtered;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stock':
        return <AlertTriangle className="h-4 w-4" />;
      case 'sync':
        return <CheckCircle className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4 text-blue-600" />;
    }
  };

  const stockSummary = getStockAlertSummary();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notification Center</span>
              {state.unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {state.unreadCount}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {!isPermissionGranted() && (
                <Button size="sm" onClick={handlePermissionRequest}>
                  Enable Notifications
                </Button>
              )}
              
              <Button size="sm" variant="outline" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Permission status */}
        {!state.isSupported && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-yellow-600">
                <BellOff className="h-4 w-4" />
                <span className="text-sm">Notifications are not supported on this device</span>
              </div>
            </CardContent>
          </Card>
        )}

        {state.isSupported && !isPermissionGranted() && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-yellow-600">
                  <BellOff className="h-4 w-4" />
                  <span className="text-sm">Notifications are disabled</span>
                </div>
                <Button size="sm" onClick={handlePermissionRequest}>
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stock alerts summary */}
        {isPermissionGranted() && stockSummary.recent > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Stock Alerts (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-yellow-600">{stockSummary.categories.warning}</div>
                  <div className="text-xs text-muted-foreground">Warning</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-orange-600">{stockSummary.categories.critical}</div>
                  <div className="text-xs text-muted-foreground">Critical</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">{stockSummary.categories.urgent}</div>
                  <div className="text-xs text-muted-foreground">Urgent</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notification tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              All
              {state.history.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {state.history.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="unread">
              Unread
              {state.unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {state.unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {['all', 'unread', 'stock', 'sync', 'system'].map((filter) => (
            <TabsContent key={filter} value={filter} className="mt-4 overflow-y-auto max-h-96">
              <div className="space-y-2">
                {getFilteredNotifications(filter).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  getFilteredNotifications(filter).map((notification) => (
                    <Card 
                      key={notification.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        !notification.data?.read ? 'border-blue-200 bg-blue-50/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getPriorityIcon(notification.priority)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold truncate">
                                {notification.title}
                              </h4>
                              <div className="flex items-center space-x-2 ml-2">
                                {getCategoryIcon(notification.category)}
                                <Badge 
                                  variant={notification.priority === 'urgent' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {notification.priority}
                                </Badge>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {notification.body}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              
                              {!notification.data?.read && (
                                <Badge variant="outline" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>

                            {/* Actions */}
                            {notification.actions && notification.actions.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {notification.actions.slice(0, 2).map((action) => (
                                  <Button
                                    key={action.action}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNotificationAction(action.action, notification.data);
                                    }}
                                  >
                                    {action.title}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {state.history.length} total notifications
          </div>
          
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedTab('unread')}>
              <Clock className="h-4 w-4 mr-1" />
              Show Unread
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}