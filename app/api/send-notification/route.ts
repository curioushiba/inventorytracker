import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import webpush from 'web-push';

// Configure web-push with VAPID keys
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_SUBJECT || 'mailto:admin@inventorytracker.com';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
} else {
  console.warn('VAPID keys not configured. Push notifications will not work.');
}

interface NotificationPayload {
  type: 'low_stock' | 'stock_update' | 'system' | 'sync_status';
  data: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    tag?: string;
    requireInteraction?: boolean;
    actions?: Array<{
      action: string;
      title: string;
      icon?: string;
    }>;
    data?: any;
  };
  userId?: string;
  targetUsers?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user (for authentication)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!publicVapidKey || !privateVapidKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 500 }
      );
    }

    const payload: NotificationPayload = await request.json();

    if (!payload.type || !payload.data || !payload.data.title || !payload.data.body) {
      return NextResponse.json(
        { error: 'Invalid notification payload' },
        { status: 400 }
      );
    }

    // Determine target users
    let targetUserIds: string[] = [];
    
    if (payload.targetUsers && payload.targetUsers.length > 0) {
      targetUserIds = payload.targetUsers;
    } else if (payload.userId) {
      targetUserIds = [payload.userId];
    } else {
      // Default to current user if no targets specified
      targetUserIds = [user.id];
    }

    // Get active push subscriptions for target users
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)
      .eq('is_active', true);

    if (subscriptionsError) {
      console.error('Failed to fetch push subscriptions:', subscriptionsError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No active subscriptions found', sent: 0 },
        { status: 200 }
      );
    }

    // Check notification settings for each user
    const { data: notificationSettings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .in('user_id', targetUserIds);

    if (settingsError) {
      console.error('Failed to fetch notification settings:', settingsError);
    }

    // Filter subscriptions based on user settings
    const filteredSubscriptions = subscriptions.filter(subscription => {
      const userSettings = notificationSettings?.find(s => s.user_id === subscription.user_id);
      
      if (!userSettings) return true; // Default to enabled if no settings found
      
      // Check if this type of notification is enabled for the user
      switch (payload.type) {
        case 'low_stock':
          return userSettings.low_stock_alerts;
        case 'stock_update':
          return userSettings.stock_updates;
        case 'system':
          return userSettings.system_notifications;
        case 'sync_status':
          return userSettings.sync_status;
        default:
          return true;
      }
    });

    // Send notifications
    const results = await Promise.allSettled(
      filteredSubscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key,
            },
          };

          const notificationPayload = {
            ...payload,
            timestamp: Date.now(),
            userId: subscription.user_id,
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationPayload),
            {
              TTL: 24 * 60 * 60, // 24 hours
              urgency: payload.type === 'low_stock' ? 'high' : 'normal',
            }
          );

          // Log successful notification
          await supabase.from('notification_logs').insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            notification_type: payload.type,
            title: payload.data.title,
            body: payload.data.body,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          return { success: true, userId: subscription.user_id };
        } catch (error) {
          console.error(`Failed to send push notification to user ${subscription.user_id}:`, error);
          
          // Log failed notification
          await supabase.from('notification_logs').insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            notification_type: payload.type,
            title: payload.data.title,
            body: payload.data.body,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            sent_at: new Date().toISOString(),
          });

          // Handle specific errors
          if (error instanceof Error) {
            if (error.message.includes('410')) {
              // Subscription is no longer valid, deactivate it
              await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('id', subscription.id);
            }
          }

          throw error;
        }
      })
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    return NextResponse.json({
      message: 'Notifications processed',
      sent: successful,
      failed,
      total: filteredSubscriptions.length,
    });

  } catch (error) {
    console.error('Error in POST /api/send-notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper endpoint to send low stock alerts (can be called by cron jobs)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');
    
    // Simple API key check for cron jobs
    if (apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get all items that are low stock
    const { data: lowStockItems, error } = await supabase
      .from('items')
      .select(`
        id,
        name,
        quantity,
        min_quantity,
        user_id,
        users!inner(id)
      `)
      .lte('quantity', 'min_quantity')
      .gt('min_quantity', 0);

    if (error) {
      console.error('Failed to fetch low stock items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch low stock items' },
        { status: 500 }
      );
    }

    if (!lowStockItems || lowStockItems.length === 0) {
      return NextResponse.json({
        message: 'No low stock items found',
        processed: 0,
      });
    }

    // Group items by user
    const itemsByUser = lowStockItems.reduce((acc, item) => {
      if (!acc[item.user_id]) {
        acc[item.user_id] = [];
      }
      acc[item.user_id].push(item);
      return acc;
    }, {} as Record<string, typeof lowStockItems>);

    let totalNotificationsSent = 0;

    // Send notifications for each user
    for (const [userId, userItems] of Object.entries(itemsByUser)) {
      for (const item of userItems) {
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'low_stock',
              userId,
              data: {
                title: '⚠️ Low Stock Alert',
                body: `${item.name} is running low (${item.quantity}/${item.min_quantity})`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: `low-stock-${item.id}`,
                requireInteraction: true,
                actions: [
                  {
                    action: 'view-item',
                    title: 'View Item',
                  },
                  {
                    action: 'restock',
                    title: 'Mark Restocked',
                  },
                ],
                data: {
                  type: 'low_stock',
                  itemId: item.id,
                  itemName: item.name,
                  currentStock: item.quantity,
                  minStock: item.min_quantity,
                  url: '/dashboard?filter=low-stock',
                },
              },
            }),
          });

          if (response.ok) {
            const result = await response.json();
            totalNotificationsSent += result.sent || 0;
          }
        } catch (error) {
          console.error(`Failed to send low stock alert for item ${item.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      message: 'Low stock alerts processed',
      itemsProcessed: lowStockItems.length,
      notificationsSent: totalNotificationsSent,
    });

  } catch (error) {
    console.error('Error in GET /api/send-notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}