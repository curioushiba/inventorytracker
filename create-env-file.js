const fs = require('fs');
const path = require('path');

// Create .env.local file content
const envContent = `# Supabase Configuration
# Replace these with your actual Supabase project credentials

# Your Supabase project URL (found in your Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Your Supabase anon key (found in your Supabase dashboard under Settings > API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Example format:
# NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
`;

// Get the current directory (should be inventory-tracker)
const currentDir = process.cwd();
const envFilePath = path.join(currentDir, '.env.local');

console.log('Creating .env.local file...');
console.log('Location:', envFilePath);

try {
  fs.writeFileSync(envFilePath, envContent);
  console.log('✅ .env.local file created successfully!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Edit the .env.local file and replace the placeholder values with your actual Supabase credentials');
  console.log('2. Restart your development server: npm run dev');
  console.log('3. Test the environment variables: http://localhost:3000/api/test-env');
} catch (error) {
  console.error('❌ Error creating .env.local file:', error.message);
}
