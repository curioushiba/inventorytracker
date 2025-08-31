-- Push Notification Database Schema
-- Execute these queries in your Supabase SQL editor

-- 1. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure one subscription per user per endpoint
  UNIQUE(user_id, endpoint)
);

-- 2. Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  low_stock_alerts BOOLEAN DEFAULT true NOT NULL,
  stock_updates BOOLEAN DEFAULT true NOT NULL,
  system_notifications BOOLEAN DEFAULT true NOT NULL,
  sync_status BOOLEAN DEFAULT false NOT NULL,
  sound BOOLEAN DEFAULT true NOT NULL,
  vibrate BOOLEAN DEFAULT true NOT NULL,
  show_image BOOLEAN DEFAULT true NOT NULL,
  require_interaction BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Notification Logs Table (for tracking sent notifications)
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('low_stock', 'stock_update', 'system', 'sync_status')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delivered', 'clicked', 'dismissed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  interacted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Low Stock Alert History Table (for preventing duplicate alerts)
CREATE TABLE IF NOT EXISTS low_stock_alert_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'critical')),
  stock_level INTEGER NOT NULL,
  min_stock_level INTEGER NOT NULL,
  alerted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate alerts for same item in short timeframe
  UNIQUE(user_id, item_id, DATE(alerted_at))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_low_stock_alert_history_user_item ON low_stock_alert_history(user_id, item_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alert_history_alerted_at ON low_stock_alert_history(alerted_at);

-- Enable Row Level Security (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_settings
CREATE POLICY "Users can view their own notification settings"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_logs
CREATE POLICY "Users can view their own notification logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service to insert notification logs (needed for API)
CREATE POLICY "Service can insert notification logs"
  ON notification_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for low_stock_alert_history
CREATE POLICY "Users can view their own alert history"
  ON low_stock_alert_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert history"
  ON low_stock_alert_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for active subscriptions with user details
CREATE OR REPLACE VIEW active_push_subscriptions AS
SELECT 
  ps.*,
  ns.low_stock_alerts,
  ns.stock_updates,
  ns.system_notifications,
  ns.sync_status
FROM push_subscriptions ps
LEFT JOIN notification_settings ns ON ps.user_id = ns.user_id
WHERE ps.is_active = true;

-- Optional: Function to clean up old notification logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete logs older than 90 days
  DELETE FROM notification_logs 
  WHERE sent_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Optional: Function to clean up old alert history (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_alert_history()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete alert history older than 30 days
  DELETE FROM low_stock_alert_history 
  WHERE alerted_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';