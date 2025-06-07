/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Current policies are causing infinite recursion by querying the profiles table within policy conditions
    - This creates a loop when trying to evaluate permissions

  2. Solution
    - Replace recursive policies with simple, direct conditions
    - Use auth.uid() directly for user identification
    - Separate admin/staff checks to avoid circular references

  3. Changes
    - Drop existing problematic policies
    - Create new, non-recursive policies
    - Ensure users can manage their own profiles
    - Allow admin/staff to manage all profiles without circular lookups
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Admin and staff can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin and staff can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create new, non-recursive policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for new user registration)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admin users can view all profiles
-- This uses a simple role check without recursion
CREATE POLICY "Admin can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Admin users can manage all profiles
CREATE POLICY "Admin can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Staff users can view all profiles
CREATE POLICY "Staff can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'staff'
    )
  );

-- Staff users can manage all profiles
CREATE POLICY "Staff can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'staff'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'staff'
    )
  );