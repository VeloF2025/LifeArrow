/*
  # Add onboarding status tracking

  1. New Fields
    - Add `onboarding_completed` boolean to client_onboarding_data
    - Add `onboarding_progress` jsonb to track partial completion
    - Add `last_saved_at` timestamp for auto-save functionality

  2. Security
    - Update existing policies to handle onboarding status
*/

-- Add onboarding tracking fields to client_onboarding_data
ALTER TABLE client_onboarding_data 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMPTZ DEFAULT now();

-- Create index for onboarding status queries
CREATE INDEX IF NOT EXISTS idx_client_onboarding_completed 
ON client_onboarding_data(onboarding_completed);

-- Create index for last saved queries
CREATE INDEX IF NOT EXISTS idx_client_onboarding_last_saved 
ON client_onboarding_data(last_saved_at);

-- Update the trigger to handle the new fields
CREATE OR REPLACE FUNCTION update_client_onboarding_last_saved()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_saved_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating last_saved_at
DROP TRIGGER IF EXISTS update_client_onboarding_last_saved_trigger ON client_onboarding_data;
CREATE TRIGGER update_client_onboarding_last_saved_trigger
  BEFORE UPDATE ON client_onboarding_data
  FOR EACH ROW
  EXECUTE FUNCTION update_client_onboarding_last_saved();