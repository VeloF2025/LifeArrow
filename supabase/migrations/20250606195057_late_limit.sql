/*
  # Fix role policies and constraints

  1. Role Management
    - Ensure role constraint exists with correct values
    - Set default role to 'client'
    - Create helper functions for role management

  2. Security
    - Update RLS policies to work with database roles
    - Create functions for safe role checking
    - Grant appropriate permissions

  3. Utility Functions
    - Role assignment function for admins
    - Role testing function
    - User role getter function
*/

-- Ensure the profiles table has the correct role constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_check' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  
  -- Add the correct role constraint
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'staff', 'client'));
END $$;

-- Ensure default role is set correctly
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'client';

-- Create a function to safely get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  RETURN COALESCE(user_role, 'client');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if current user has required role
CREATE OR REPLACE FUNCTION user_has_role(required_role text)
RETURNS boolean AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role FROM profiles WHERE id = auth.uid();
  
  CASE required_role
    WHEN 'admin' THEN
      RETURN current_role = 'admin';
    WHEN 'staff' THEN
      RETURN current_role IN ('admin', 'staff');
    WHEN 'client' THEN
      RETURN current_role IN ('admin', 'staff', 'client');
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to assign roles (for admin use)
CREATE OR REPLACE FUNCTION assign_user_role(user_id uuid, new_role text)
RETURNS boolean AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if the current user is an admin
  SELECT role INTO current_user_role FROM profiles WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Validate the new role
  IF new_role NOT IN ('admin', 'staff', 'client') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- Update the user's role
  UPDATE profiles 
  SET role = new_role, updated_at = now()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test function to verify roles
CREATE OR REPLACE FUNCTION test_roles()
RETURNS TABLE(role_name text, role_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.role as role_name,
    COUNT(*) as role_count
  FROM profiles p
  WHERE p.role IN ('admin', 'staff', 'client')
  GROUP BY p.role
  ORDER BY p.role;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION test_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_role(uuid, text) TO authenticated;

-- Update RLS policies to use database role checking
-- Admin full access policy
DROP POLICY IF EXISTS "Admin full access" ON profiles;
CREATE POLICY "Admin full access" ON profiles
  FOR ALL TO authenticated
  USING (user_has_role('admin'));

-- Staff read access policy  
DROP POLICY IF EXISTS "Staff read access" ON profiles;
CREATE POLICY "Staff read access" ON profiles
  FOR SELECT TO authenticated
  USING (user_has_role('staff'));

-- Users can view own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Users can update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Users can insert own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Update client onboarding data policies
DROP POLICY IF EXISTS "Clients can view own onboarding data" ON client_onboarding_data;
CREATE POLICY "Clients can view own onboarding data" ON client_onboarding_data
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients can insert own onboarding data" ON client_onboarding_data;
CREATE POLICY "Clients can insert own onboarding data" ON client_onboarding_data
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients can update own onboarding data" ON client_onboarding_data;
CREATE POLICY "Clients can update own onboarding data" ON client_onboarding_data
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Staff and admin can manage all onboarding data" ON client_onboarding_data;
CREATE POLICY "Staff and admin can manage all onboarding data" ON client_onboarding_data
  FOR ALL TO authenticated
  USING (user_has_role('staff'));

DROP POLICY IF EXISTS "Staff and admin can view all onboarding data" ON client_onboarding_data;
CREATE POLICY "Staff and admin can view all onboarding data" ON client_onboarding_data
  FOR SELECT TO authenticated
  USING (user_has_role('staff'));

-- Update clients table policies
DROP POLICY IF EXISTS "Clients can view own data" ON clients;
CREATE POLICY "Clients can view own data" ON clients
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Staff and admin can manage clients" ON clients;
CREATE POLICY "Staff and admin can manage clients" ON clients
  FOR ALL TO authenticated
  USING (user_has_role('staff'));

DROP POLICY IF EXISTS "Staff and admin can view all clients" ON clients;
CREATE POLICY "Staff and admin can view all clients" ON clients
  FOR SELECT TO authenticated
  USING (user_has_role('staff'));

-- Verify the setup
DO $$
DECLARE
  constraint_exists boolean;
  total_profiles integer;
BEGIN
  -- Check constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'profiles_role_check'
    AND check_clause LIKE '%admin%'
    AND check_clause LIKE '%staff%' 
    AND check_clause LIKE '%client%'
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'Role constraint not properly configured';
  END IF;
  
  -- Count total profiles
  SELECT COUNT(*) INTO total_profiles FROM profiles;
  
  RAISE NOTICE 'Role system configured successfully';
  RAISE NOTICE 'Total profiles: %', total_profiles;
  RAISE NOTICE 'User roles (admin, staff, client) are properly configured with RLS policies';
END $$;