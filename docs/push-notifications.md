# Push Notification System Documentation

## Overview

This comprehensive push notification system enables the Inventory Tracker PWA to send real-time notifications to users about low stock alerts, inventory updates, and system events. The system works both online and offline, with queuing and background sync capabilities.

## Architecture

### Core Components

1. **VAPID Configuration** (`/lib/push/vapid-config.ts`)
   - Manages VAPID keys for secure push notifications
   - Handles subscription creation and management
   - Browser compatibility detection

2. **Notification Utils** (`/lib/push/notification-utils.ts`)
   - Notification templates and formatting
   - Local notification management (fallback)
   - Offline notification queuing

3. **Push Notification Context** (`/contexts/push-notification-context.tsx`)
   - React context for managing push notification state
   - Subscription management and user preferences
   - Integration with other app contexts

4. **Service Worker Handlers** (`/public/sw-custom.js`)
   - Push event handling
   - Background sync for offline notifications
   - Click action handling

5. **Low Stock Monitor** (`/hooks/use-low-stock-monitor.ts`)
   - Automated monitoring of inventory levels
   - Configurable alert thresholds and timing
   - Duplicate alert prevention

## Features

### 🔔 Notification Types

- **Low Stock Alerts**: Automatic notifications when items fall below minimum quantities
- **Stock Updates**: Notifications for inventory quantity changes
- **System Notifications**: App updates and important system messages
- **Sync Status**: Optional notifications about data synchronization

### ⚙️ User Controls

- **Permission Management**: Request and manage browser notification permissions
- **Subscription Control**: Enable/disable push notifications
- **Granular Settings**: Control which types of notifications to receive
- **Display Options**: Sound, vibration, images, and interaction requirements

### 🌐 Offline Support

- **Notification Queuing**: Queue notifications when offline for delivery when online
- **Background Sync**: Automatic processing of queued notifications
- **Local Notifications**: Fallback to browser notifications when push isn't available

### 🎯 Smart Alerting

- **Duplicate Prevention**: Avoid sending the same alert multiple times
- **Severity Levels**: Different urgency levels (warning/critical)
- **Customizable Thresholds**: Configure when alerts trigger
- **Historical Tracking**: Keep track of sent alerts

## Setup Instructions

### 1. Environment Variables

Add these environment variables to your `.env.local`:

```env
# VAPID Keys (generate using web-push library)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_vapid_key_here
VAPID_PRIVATE_KEY=your_private_vapid_key_here
VAPID_EMAIL=mailto:admin@yourdomain.com

# Optional: For cron-based notifications
CRON_API_KEY=your_secure_api_key_here
```

### 2. Database Setup

Run the SQL commands in `/scripts/push-notification-schema.sql` in your Supabase SQL editor to create the required tables:

- `push_subscriptions`: Store user push subscriptions
- `notification_settings`: User notification preferences
- `notification_logs`: Track sent notifications
- `low_stock_alert_history`: Prevent duplicate alerts

### 3. VAPID Key Generation

Install web-push CLI and generate keys:

```bash
npm install -g web-push
web-push generate-vapid-keys
```

### 4. Dependencies

Install required packages (already added to package.json):

```bash
npm install web-push
npm install --save-dev @types/web-push
```

## API Endpoints

### Push Subscription Management

- `GET /api/push-subscriptions` - Get user's active subscriptions
- `POST /api/push-subscriptions` - Create/update subscription
- `DELETE /api/push-subscriptions` - Deactivate subscription

### Notification Sending

- `POST /api/send-notification` - Send notification to specific users
- `GET /api/send-notification?apiKey=xxx` - Automated low stock alerts (for cron jobs)

## Usage Examples

### Basic Setup in Components

```tsx
import { usePushNotifications } from '@/contexts/push-notification-context';
import { PermissionBanner, NotificationSettings } from '@/components/notifications';

function MyComponent() {
  const {
    isSupported,
    isSubscribed,
    subscribe,
    showLowStockAlert
  } = usePushNotifications();

  // Show a low stock alert
  const handleLowStock = async () => {
    await showLowStockAlert('Product Name', 2, 10);
  };

  return (
    <div>
      {!isSubscribed && <PermissionBanner />}
      <NotificationSettings />
    </div>
  );
}
```

### Low Stock Monitoring

```tsx
import { useLowStockMonitor } from '@/hooks/use-low-stock-monitor';

function InventoryDashboard() {
  const monitor = useLowStockMonitor({
    enabled: true,
    checkIntervalMs: 30000, // 30 seconds
    criticalThresholdPercent: 50
  });

  // Get low stock items with alert context
  const lowStockItems = monitor.getLowStockItemsWithAlerts();
  const stats = monitor.getAlertStats();

  return (
    <div>
      <h2>Low Stock Items: {stats.total}</h2>
      <p>Critical: {stats.critical}, Warning: {stats.warning}</p>
      
      <button onClick={() => monitor.checkNow()}>
        Check Now
      </button>
    </div>
  );
}
```

### Manual Notification Sending

```tsx
// Send a system notification
await fetch('/api/send-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'system',
    userId: 'user-id',
    data: {
      title: '✅ Sync Complete',
      body: 'All data has been synchronized successfully',
      tag: 'sync-complete'
    }
  })
});
```

## Configuration Options

### Low Stock Monitor Config

```typescript
interface LowStockMonitorConfig {
  enabled: boolean;                    // Enable/disable monitoring
  checkIntervalMs: number;             // How often to check (default: 30000)
  criticalThresholdPercent: number;    // % below min stock for critical alerts
  suppressDuplicateAlertMinutes: number; // Minutes to wait before re-alerting
}
```

### Notification Settings

```typescript
interface NotificationSettings {
  lowStockAlerts: boolean;      // Enable low stock notifications
  stockUpdates: boolean;        // Enable stock change notifications
  systemNotifications: boolean; // Enable system messages
  syncStatus: boolean;          // Enable sync status notifications
  sound: boolean;              // Play sound
  vibrate: boolean;            // Vibrate device
  showImage: boolean;          // Show images in notifications
  requireInteraction: boolean;  // Keep notifications visible until clicked
}
```

## Security Considerations

1. **VAPID Keys**: Keep private keys secure and never expose them in client-side code
2. **Row Level Security**: All database tables have RLS policies to protect user data
3. **API Authentication**: All API endpoints require user authentication
4. **Subscription Validation**: Validate subscription endpoints before saving

## Browser Support

- **Chrome/Edge**: Full support including background sync
- **Firefox**: Full support with service workers
- **Safari**: iOS 16.4+ and macOS 13+ support web push
- **Mobile**: Works on installed PWAs

## Troubleshooting

### Common Issues

1. **Notifications not appearing**
   - Check browser permissions
   - Verify VAPID keys are correct
   - Check service worker registration

2. **Duplicate notifications**
   - Check alert history table
   - Verify suppression settings
   - Check for multiple service worker instances

3. **Offline notifications not working**
   - Verify IndexedDB support
   - Check service worker background sync registration
   - Ensure proper error handling

### Debug Tools

Enable debug logging by adding to localStorage:

```javascript
localStorage.setItem('debug_notifications', 'true');
```

## Performance Considerations

1. **Monitoring Interval**: Balance between responsiveness and battery life
2. **Alert History**: Regularly clean up old records (automated via SQL functions)
3. **Notification Logs**: Archive old logs to prevent database bloat
4. **Queue Size**: Limited to 50 queued notifications per user

## Future Enhancements

- **Rich Notifications**: Add more interactive elements
- **Scheduled Notifications**: Time-based alerts
- **Analytics**: Track notification effectiveness
- **A/B Testing**: Test different notification strategies
- **Machine Learning**: Predict when items will run low

## Testing

### Manual Testing

1. Enable notifications in browser
2. Create item with low stock
3. Verify alert is sent
4. Test offline queuing by going offline
5. Verify settings persistence

### Automated Testing

```bash
# Test low stock alert API
curl -X GET "http://localhost:3000/api/send-notification?apiKey=test" \
  -H "Content-Type: application/json"

# Test subscription endpoint
curl -X POST "http://localhost:3000/api/push-subscriptions" \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "test", "p256dh_key": "test", "auth_key": "test"}'
```

## Support

For issues or questions:
- Check browser console for errors
- Review service worker logs
- Examine database logs in Supabase
- Test with different browsers and devices