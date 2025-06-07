/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The "Admins can view all profiles" policy creates infinite recursion
    - It queries the profiles table from within a profiles table policy
    - This happens when checking user role: `SELECT profiles_1.role FROM profiles profiles_1 WHERE (profiles_1.id = uid())`

  2. Solution
    - Drop the problematic policy that causes recursion
    - Keep the simple "Users can view own profile" policy
    - For admin access, we'll handle this at the application level or use a different approach
    - Ensure users can still manage their own profiles

  3. Security
    - Users can only view/update their own profile
    - Admin functionality will need to be handled differently (e.g., service role queries)
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Keep the existing policies that work correctly
-- "Users can view own profile" - this one is fine: (uid() = id)
-- "Users can insert own profile" - this one is fine: (uid() = id)  
-- "Users can update own profile" - this one is fine: (uid() = id)

-- Note: For admin functionality, the application should use service role
-- or implement admin access through a different mechanism that doesn't
-- create circular dependencies in RLS policies