/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The "Admins can view all profiles" policy creates infinite recursion
    - It tries to query the profiles table within a policy ON the profiles table
    - This causes the "infinite recursion detected in policy" error

  2. Solution
    - Drop the problematic policy that causes recursion
    - Create a simpler policy structure that avoids circular dependencies
    - Use auth.uid() directly without querying profiles table within policies

  3. New Policy Structure
    - Users can view their own profile (using auth.uid())
    - Separate policies for different operations to avoid complexity
    - Admin access will be handled at application level or through separate mechanisms
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Drop other policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- For admin access, we'll handle this at the application level
-- or create a separate approach that doesn't cause recursion
-- For now, admins will need to use service role key for admin operations