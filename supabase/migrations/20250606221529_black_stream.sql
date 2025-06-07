/*
  # Fix RLS policy for clients table

  1. Security Changes
    - Add INSERT policy for admin and staff users to create new client records
    - This allows the ClientOnboardingManager to successfully create new clients

  The current policies only allow SELECT operations for staff/admin, but not INSERT.
  This migration adds the missing INSERT policy.
*/

-- Add INSERT policy for admin and staff users
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