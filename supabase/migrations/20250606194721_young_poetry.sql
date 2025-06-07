/*
  # Client Onboarding Data Table

  1. New Tables
    - `client_onboarding_data` - Extended onboarding information for clients
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to profiles)
      - `medications` (text, optional)
      - `allergies` (text, optional)
      - `previous_surgeries` (text, optional)
      - `primary_goals` (text array)
      - `activity_level` (text)
      - `dietary_preferences` (text, optional)
      - `marketing_consent` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `client_onboarding_data` table
    - Add policies for clients to manage their own data
    - Add policies for staff and admin to view/manage all data

  3. Indexes
    - Add index on client_id for better query performance
*/

-- Create client onboarding data table
CREATE TABLE IF NOT EXISTS client_onboarding_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  medications text,
  allergies text,
  previous_surgeries text,
  primary_goals text[] DEFAULT '{}',
  activity_level text,
  dietary_preferences text,
  marketing_consent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE client_onboarding_data ENABLE ROW LEVEL SECURITY;

-- Create policies for client onboarding data
CREATE POLICY "Clients can view own onboarding data" ON client_onboarding_data
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Clients can insert own onboarding data" ON client_onboarding_data
  FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update own onboarding data" ON client_onboarding_data
  FOR UPDATE USING (client_id = auth.uid());

CREATE POLICY "Staff and admin can view all onboarding data" ON client_onboarding_data
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff and admin can manage all onboarding data" ON client_onboarding_data
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_onboarding_data_client_id ON client_onboarding_data(client_id);

-- Add updated_at trigger
CREATE TRIGGER update_client_onboarding_data_updated_at 
  BEFORE UPDATE ON client_onboarding_data
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Add constraint for activity level
ALTER TABLE client_onboarding_data 
ADD CONSTRAINT client_onboarding_data_activity_level_check 
CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active'));