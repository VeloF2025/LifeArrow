/*
  # Fix clients table RLS policies

  1. Security Updates
    - Add missing INSERT policy for admin and staff users
    - Fix existing policies to ensure proper access control
    - Ensure all CRUD operations are properly covered

  2. Changes
    - Add INSERT policy for admin/staff to create clients
    - Update existing policies for consistency
    - Ensure proper role-based access control
*/

-- First, let's check and fix the existing policies
-- Drop any conflicting policies and recreate them properly

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin and staff can create clients" ON clients;
DROP POLICY IF EXISTS "Staff and admin can manage clients" ON clients;
DROP POLICY IF EXISTS "Staff and admin can view all clients" ON clients;
DROP POLICY IF EXISTS "Clients can view own data" ON clients;

-- Create comprehensive policies for the clients table

-- Policy for clients to view their own data
CREATE POLICY "Clients can view own data"
  ON clients
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Policy for admin and staff to view all clients
CREATE POLICY "Admin and staff can view all clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Policy for admin and staff to create clients
CREATE POLICY "Admin and staff can create clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Policy for admin and staff to update clients
CREATE POLICY "Admin and staff can update clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Policy for admin and staff to delete clients
CREATE POLICY "Admin and staff can delete clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Policy for clients to update their own data (if needed)
CREATE POLICY "Clients can update own data"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());