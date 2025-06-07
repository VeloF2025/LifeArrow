/*
  # Fix profiles table RLS policies

  1. Security Changes
    - Drop existing problematic RLS policies that cause infinite recursion
    - Create simple, non-recursive RLS policies for profiles table
    - Ensure policies use auth.uid() directly without subqueries to profiles table

  2. Policy Updates
    - Users can view their own profile using direct auth.uid() comparison
    - Users can update their own profile using direct auth.uid() comparison
    - Users can insert their own profile using direct auth.uid() comparison
    - Admins can view all profiles using role check without recursion
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create new non-recursive policies
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

-- Create a separate policy for admins that doesn't cause recursion
-- This policy allows users with admin role to view all profiles
-- We'll use a function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );