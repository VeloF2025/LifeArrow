/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Existing policies were querying the profiles table within policy conditions
    - This created infinite recursion when trying to access profiles

  2. Solution
    - Use auth.uid() directly for user access policies
    - Use auth.jwt() with proper JSON operators for role-based access
    - Avoid querying profiles table within policy conditions

  3. Changes
    - Drop all existing problematic policies
    - Create new policies without recursion
    - Use proper JSON operators for JWT metadata access
*/

-- Fix infinite recursion in profiles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can manage all profiles" ON profiles;

-- Create new policies without recursion
-- Basic user policies using auth.uid() directly
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (id = auth.uid());

-- Admin policies using direct role check from auth.jwt()
CREATE POLICY "Admin full access" ON profiles
FOR ALL USING (
  COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  ) = 'admin'
);

-- Staff policies for read access
CREATE POLICY "Staff read access" ON profiles
FOR SELECT USING (
  COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  ) = ANY(ARRAY['admin', 'staff'])
);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;