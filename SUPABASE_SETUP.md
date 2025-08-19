# Supabase Setup Guide for Inventory Tracker

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: Inventory Tracker (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
6. Click "Create new project"
7. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (the `anon` key, not the `service_role` key)

## Step 3: Create Environment File

1. In your `inventory-tracker` folder, create a new file called `.env.local`
2. Add the following content (replace with your actual values):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Important**: 
- Replace `your-project-ref` with your actual project reference
- Replace `your_supabase_anon_key_here` with your actual anon key
- The `.env.local` file should never be committed to git (it's already in .gitignore)

## Step 4: Database Tables Setup

Go to your Supabase dashboard and navigate to **SQL Editor**. Copy and paste the following SQL commands to create the required tables:

### 1. Items Table
```sql
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  category TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX items_user_id_idx ON items(user_id);
CREATE INDEX items_last_updated_idx ON items(last_updated DESC);
```

### 2. Categories Table
```sql
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create index for better performance
CREATE INDEX categories_user_id_idx ON categories(user_id);
```

### 3. Activities Table
```sql
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  quantity_change INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX activities_user_id_idx ON activities(user_id);
CREATE INDEX activities_timestamp_idx ON activities(timestamp DESC);
```

## Step 5: Row Level Security (RLS) Policies

Enable Row Level Security to ensure users can only access their own data:

```sql
-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Items policies
CREATE POLICY "Users can view their own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" ON items
  FOR DELETE USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- Activities policies
CREATE POLICY "Users can view their own activities" ON activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Step 6: Test Your Setup

### Method 1: Using the Test Script
1. Install the dotenv dependency:
   ```bash
   npm install dotenv
   ```
2. Run the test script:
   ```bash
   npm run test:supabase
   ```

### Method 2: Using the Web Interface
1. Start your Next.js development server:
   ```bash
   npm run dev
   ```
2. Open your browser and go to: `http://localhost:3000/api/test-db`
3. You should see a JSON response showing the status of your database connection

### Method 3: Test the Full App
1. Make sure your dev server is running: `npm run dev`
2. Open your app in the browser: `http://localhost:3000`
3. Try to sign up with a new account
4. If successful, you should be able to create inventory items!

## Troubleshooting

### Common Issues:

1. **"Missing environment variable" error**:
   - Make sure your `.env.local` file is in the root of `inventory-tracker` folder
   - Restart your development server after creating the file

2. **"Failed to load items" error**:
   - Check that all database tables are created
   - Verify RLS policies are set up correctly

3. **Authentication not working**:
   - Confirm you're using the `anon` key, not the `service_role` key
   - Check that your Supabase URL is correct

4. **CORS errors**:
   - Make sure your domain is added to the allowed origins in Supabase dashboard under **Authentication** > **Settings**

### Need Help?
If you encounter any issues, check:
1. Browser developer console for error messages
2. Supabase dashboard logs under **Logs** section
3. Ensure your environment variables are correctly set
