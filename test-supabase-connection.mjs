// Test Supabase Connection
// Run this script to verify your Supabase setup is working
// Usage: npm run test:supabase

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
    return;
  }

  if (!supabaseKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local');
    return;
  }

  console.log('✅ Environment variables found');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Anon Key: ${supabaseKey.substring(0, 20)}...`);

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created');

    // Test basic connection
    const { data, error } = await supabase.from('items').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      
      if (error.message.includes('relation "items" does not exist')) {
        console.log('\n💡 The "items" table doesn\'t exist yet.');
        console.log('   Please run the SQL commands from database-setup.sql in your Supabase dashboard.');
      }
      return;
    }

    console.log('✅ Database connection successful');
    console.log(`📊 Items table exists and is accessible`);

    // Test other tables
    const { error: categoriesError } = await supabase.from('categories').select('count', { count: 'exact', head: true });
    const { error: activitiesError } = await supabase.from('activities').select('count', { count: 'exact', head: true });

    if (!categoriesError) console.log('✅ Categories table exists');
    else console.log('⚠️ Categories table missing or inaccessible');

    if (!activitiesError) console.log('✅ Activities table exists');
    else console.log('⚠️ Activities table missing or inaccessible');

    console.log('\n🎉 Supabase setup appears to be working correctly!');
    console.log('You can now run your Next.js app with: npm run dev');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testSupabaseConnection();
