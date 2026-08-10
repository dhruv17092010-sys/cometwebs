# Comet Webs — Supabase Authentication System Setup Guide

This guide will walk you through setting up the complete authentication and client management system for your Comet Webs website using Supabase's free tier.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create a Supabase Account](#step-1-create-a-supabase-account)
3. [Step 2: Create a New Project](#step-2-create-a-new-project)
4. [Step 3: Set Up Database Tables](#step-3-set-up-database-tables)
5. [Step 4: Configure Authentication](#step-4-configure-authentication)
6. [Step 5: Set Up Row Level Security (RLS)](#step-5-set-up-row-level-security-rls)
7. [Step 6: Get Your API Credentials](#step-6-get-your-api-credentials)
8. [Step 7: Update Your Website Code](#step-7-update-your-website-code)
9. [Step 8: Add an Admin User](#step-8-add-an-admin-user)
10. [Step 9: Test the System](#step-9-test-the-system)
11. [File Structure](#file-structure)
12. [How It Works](#how-it-works)

---

## Prerequisites

- A web browser
- Basic understanding of HTML/JavaScript
- Access to your website files

---

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign Up"**
3. Sign up using GitHub, email, or another preferred method
4. Verify your email address if required

---

## Step 2: Create a New Project

1. After logging in, click **"New Project"**
2. Fill in the project details:
   - **Name**: `Comet Webs` (or your preferred name)
   - **Database Password**: Choose a strong password (save this securely!)
   - **Region**: Select the region closest to your users
3. Click **"Create new project"**
4. Wait for the project to be set up (this may take a few minutes)

---

## Step 3: Set Up Database Tables

### 3.1 Create the `client_requests` Table

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Paste the following SQL and click **"Run"**:

```sql
-- Create client_requests table
CREATE TABLE IF NOT EXISTS client_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'contacted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_client_requests_user_id ON client_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_status ON client_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_requests_created_at ON client_requests(created_at DESC);
```

### 3.2 Create the `admins` Table

1. In the SQL Editor, create another new query
2. Paste the following SQL and click **"Run"**:

```sql
-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
```

### 3.3 Enable Automatic Updated At Trigger

```sql
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for client_requests
CREATE TRIGGER update_client_requests_updated_at
  BEFORE UPDATE ON client_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 4: Configure Authentication

### 4.1 Enable Email Authentication

1. Go to **Authentication** → **Providers** (left sidebar)
2. Ensure **Email** provider is enabled (it should be by default)
3. Optionally configure email templates under **Authentication** → **Email Templates**

### 4.2 Configure Site URL

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your website's URL (e.g., `https://yourdomain.com`)
3. Under **Redirect URLs**, add:
   - `http://localhost:*` (for local development)
   - `https://yourdomain.com/*` (for production)

---

## Step 5: Set Up Row Level Security (RLS)

Row Level Security ensures that users can only access data they're authorized to see.

### 5.1 Enable RLS on Tables

Run the following SQL in the SQL Editor:

```sql
-- Enable RLS on client_requests
ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admins
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
```

### 5.2 Create Policies for `client_requests`

```sql
-- Policy: Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON client_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own requests
CREATE POLICY "Users can insert own requests"
  ON client_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all requests
CREATE POLICY "Admins can view all requests"
  ON client_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Policy: Admins can update all requests
CREATE POLICY "Admins can update all requests"
  ON client_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );
```

### 5.3 Create Policies for `admins`

```sql
-- Policy: Only admins can view admins table
CREATE POLICY "Admins can view admins table"
  ON admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Policy: Only authenticated users can insert into admins (for initial setup)
CREATE POLICY "Authenticated users can insert into admins"
  ON admins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Step 6: Get Your API Credentials

1. Go to **Settings** → **API** (left sidebar)
2. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

⚠️ **Important**: Never share your `service_role` key. Only use the `anon` key in your frontend code.

---

## Step 7: Update Your Website Code

### 7.1 Open `supabase-auth.js`

1. Open the file `/workspace/supabase-auth.js` in your code editor
2. Find these lines at the top:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Supabase project URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase anon key
```

3. Replace the placeholder values with your actual credentials:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

4. Save the file

### 7.2 Upload Files to Your Website

Upload the following files to your website's root directory:

- `supabase-auth.js`
- `login.html`
- `client.html`
- `admin.html`
- `thank-you.html`

---

## Step 8: Add an Admin User

After setting up the database, you need to add yourself as an admin.

### Method 1: Using SQL Editor (Recommended)

1. First, create an account on your website by going to `login.html`
2. Verify your email (check your inbox)
3. In Supabase dashboard, go to **Authentication** → **Users**
4. Find your user and copy the **User ID** (UUID)
5. Go to **SQL Editor** and run:

```sql
-- Replace YOUR_USER_ID with your actual user ID
INSERT INTO admins (user_id, email)
VALUES ('YOUR_USER_ID_HERE', 'your-email@example.com');
```

### Method 2: Direct SQL (If you know your email)

```sql
-- This will find your user by email and add as admin
INSERT INTO admins (user_id, email)
SELECT id, email 
FROM auth.users 
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

---

## Step 9: Test the System

### Testing User Registration & Login

1. **Open your website** (`index.html`)
2. **Click "Get Started"** — you should be redirected to `login.html`
3. **Click "Sign Up"** link
4. **Enter your details** and create an account
5. **Check your email** for verification link (if email confirmation is enabled)
6. **Log in** with your credentials
7. You should be redirected to `client.html`

### Testing Client Request Submission

1. On `client.html`, fill out the form:
   - Business Name
   - Business Type
   - Mobile Number
2. Click **"Submit Request"**
3. You should be redirected to `thank-you.html`
4. If you try to submit again, you'll see your existing request status

### Testing Admin Dashboard

1. **Log out** from the client page
2. **Log in with the admin account** you created in Step 8
3. Navigate to `admin.html` (you can type it directly in the URL)
4. You should see all client requests
5. Try viewing and updating request statuses

### Testing Security

1. **Log in as a regular user** (not admin)
2. Try accessing `admin.html` directly
3. You should be redirected to the homepage (access denied)
4. **Log out** and try accessing `client.html`
5. You should be redirected to `login.html`

---

## File Structure

```
/workspace/
├── index.html              # Homepage (CTAs now point to login.html)
├── login.html              # Login/Signup page
├── client.html             # Client dashboard (protected)
├── admin.html              # Admin dashboard (protected, admin-only)
├── thank-you.html          # Thank you page after submission
├── supabase-auth.js        # Supabase authentication module
├── main.js                 # Existing JavaScript
├── styles.css              # Existing styles
├── products.html           # Products page (updated links)
├── explore.html            # Explore page (updated links)
├── about.html              # About page (updated links)
└── README.md               # This file
```

---

## How It Works

### Authentication Flow

1. **Unauthenticated User**:
   - Clicks any CTA button → Redirected to `login.html`
   - Can sign up or log in
   - After login → Redirected to `client.html`

2. **Authenticated User**:
   - Session stored in browser localStorage
   - Can access `client.html`
   - Can submit one request
   - Cannot access `admin.html` (unless admin)

3. **Admin User**:
   - Has entry in `admins` table
   - Can access `admin.html`
   - Can view and update all client requests

### Database Structure

**client_requests table:**
- `id`: Unique identifier for each request
- `user_id`: Links to Supabase auth user
- `email`: User's email address
- `mobile_number`: Contact number
- `business_name`: Name of the business
- `business_type`: Type/category of business
- `status`: pending, in-progress, completed, contacted
- `created_at`: Timestamp of submission

**admins table:**
- `id`: Unique identifier
- `user_id`: Links to Supabase auth user
- `email`: Admin's email
- `created_at`: When admin was added

### Security Features

1. **Row Level Security (RLS)**: Ensures users can only see their own data
2. **Admin Verification**: Server-side check for admin access
3. **Protected Routes**: Client-side redirects for unauthorized access
4. **Secure Authentication**: Supabase handles password hashing and sessions

---

## Troubleshooting

### Issue: "Invalid API key"
- **Solution**: Double-check your `SUPABASE_ANON_KEY` in `supabase-auth.js`

### Issue: "Permission denied" errors
- **Solution**: Ensure RLS policies are correctly set up (Step 5)

### Issue: Can't access admin page
- **Solution**: Verify your user has an entry in the `admins` table

### Issue: Email verification not working
- **Solution**: Check spam folder, or disable email confirmation in Supabase settings during testing

### Issue: Request submission fails
- **Solution**: Check browser console for errors, verify RLS policies allow INSERT

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify all steps were completed correctly
3. Review Supabase dashboard for any error logs
4. Ensure your internet connection is stable

---

**🎉 Congratulations!** Your authentication and client management system is now live!
