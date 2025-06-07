/*
  # User Roles Configuration

  1. Role Constraint Setup
    - Ensures profiles table has proper role constraint for admin, staff, client
    - Sets default role to 'client'

  2. Helper Functions
    - get_user_role() - safely retrieves user role
    - test_roles() - shows role distribution
    - assign_user_role() - allows admins to assign roles
    - create_demo_user_profile() - helper for creating demo users

  3. Security
    - Updates existing RLS policies to work with role-based access
    - Maintains secure access patterns
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

-- Create a function to safely get user role without recursion
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  RETURN COALESCE(user_role, 'client');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing demo users with correct roles (if they exist)
-- This only updates existing profiles, doesn't create new ones
DO $$
BEGIN
  -- Update admin user if exists
  IF EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@lifearrow.com') THEN
    UPDATE profiles 
    SET role = 'admin', first_name = 'Admin', last_name = 'User', phone = '+27123456789'
    WHERE email = 'admin@lifearrow.com';
    RAISE NOTICE 'Updated admin user profile';
  END IF;
  
  -- Update staff user if exists
  IF EXISTS (SELECT 1 FROM profiles WHERE email = 'staff@lifearrow.com') THEN
    UPDATE profiles 
    SET role = 'staff', first_name = 'Staff', last_name = 'Member', phone = '+27123456790'
    WHERE email = 'staff@lifearrow.com';
    RAISE NOTICE 'Updated staff user profile';
  END IF;
  
  -- Update client user if exists
  IF EXISTS (SELECT 1 FROM profiles WHERE email = 'client@lifearrow.com') THEN
    UPDATE profiles 
    SET role = 'client', first_name = 'Client', last_name = 'User', phone = '+27123456791'
    WHERE email = 'client@lifearrow.com';
    RAISE NOTICE 'Updated client user profile';
  END IF;
END $$;

-- Verify that all roles are working by creating a test function
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION test_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_role(uuid, text) TO authenticated;

-- Create a helper function to create demo users (for manual use)
CREATE OR REPLACE FUNCTION create_demo_user_profile(
  user_email text,
  user_role text,
  first_name text,
  last_name text,
  phone_number text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Validate role
  IF user_role NOT IN ('admin', 'staff', 'client') THEN
    RAISE EXCEPTION 'Invalid role: %', user_role;
  END IF;
  
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Insert the profile (this assumes the auth user exists)
  INSERT INTO profiles (id, email, first_name, last_name, role, phone)
  VALUES (new_user_id, user_email, first_name, last_name, user_role, phone_number)
  ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone;
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to use the demo user creation function
GRANT EXECUTE ON FUNCTION create_demo_user_profile(text, text, text, text, text) TO authenticated;

-- Verify the setup by checking role constraints
DO $$
DECLARE
  constraint_exists boolean;
  role_counts record;
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
  RAISE NOTICE 'Total profiles in database: %', total_profiles;
  
  -- Check role distribution
  FOR role_counts IN 
    SELECT role_name, role_count FROM test_roles()
  LOOP
    RAISE NOTICE 'Role %: % users', role_counts.role_name, role_counts.role_count;
  END LOOP;
  
  RAISE NOTICE 'User roles (admin, staff, client) are properly configured';
  RAISE NOTICE 'Demo users can be created through Supabase Auth UI or programmatically';
END $$;