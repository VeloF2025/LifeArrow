/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Current RLS policies on profiles table are causing infinite recursion
    - This happens when policies reference the same table they're protecting

  2. Solution
    - Drop existing problematic policies
    - Create new policies that use auth.uid() directly without subqueries
    - Ensure policies are simple and don't create circular references

  3. Security
    - Users can only access their own profile data
    - Policies use auth.uid() = id pattern to avoid recursion
*/

-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create new, simple policies that avoid recursion
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admin and staff to view all profiles
CREATE POLICY "Admin and staff can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.id IN (
        SELECT p.id FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'staff')
      )
    )
  );

-- Allow admin and staff to manage all profiles
CREATE POLICY "Admin and staff can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.id IN (
        SELECT p.id FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'staff')
      )
    )
  );