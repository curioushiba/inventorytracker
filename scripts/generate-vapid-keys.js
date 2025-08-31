#!/usr/bin/env node

/**
 * VAPID Key Generation Script
 * 
 * This script generates VAPID keys for web push notifications.
 * Run this script to generate your application's VAPID key pair.
 * 
 * Usage: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

function generateVapidKeys() {
  console.log('🔑 Generating VAPID keys for web push notifications...\n');
  
  // Generate VAPID key pair
  const vapidKeys = webpush.generateVAPIDKeys();
  
  // Display keys
  console.log('✅ VAPID keys generated successfully!\n');
  console.log('📋 Copy these keys to your environment variables:\n');
  
  console.log('🔓 Public Key (NEXT_PUBLIC_VAPID_KEY):');
  console.log(vapidKeys.publicKey);
  console.log('\n🔐 Private Key (VAPID_PRIVATE_KEY):');
  console.log(vapidKeys.privateKey);
  
  // Create .env.local template if it doesn't exist
  const envPath = path.join(process.cwd(), '.env.local');
  const envTemplate = `# VAPID Keys for Web Push Notifications
# Generated on ${new Date().toISOString()}

# Public key - safe to expose in client-side code
NEXT_PUBLIC_VAPID_KEY="${vapidKeys.publicKey}"

# Private key - KEEP SECRET! Only use server-side
VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"

# Optional: Contact email for push service
VAPID_SUBJECT="mailto:your-email@example.com"

# Your existing Supabase configuration
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
`;

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envTemplate);
    console.log('\n📄 Created .env.local with VAPID keys template');
  } else {
    console.log('\n⚠️  .env.local already exists. Add the keys manually.');
  }
  
  console.log('\n📖 Next Steps:');
  console.log('1. Add these keys to your .env.local file');
  console.log('2. Add VAPID_SUBJECT with your contact email');
  console.log('3. Restart your development server');
  console.log('4. Test push notifications in your PWA');
  
  console.log('\n🔒 Security Notes:');
  console.log('• NEVER commit the private key to version control');
  console.log('• Store private key securely in production environment');
  console.log('• Public key can be safely exposed in client code');
  console.log('• Consider key rotation every 12 months');
}

// Handle errors gracefully
try {
  generateVapidKeys();
} catch (error) {
  console.error('❌ Error generating VAPID keys:', error.message);
  process.exit(1);
}