/*
  # Add onboarding form template setting

  1. New Tables
    - `system_settings`
      - `key` (text, primary key)
      - `value` (jsonb)
      - `description` (text)
      - `updated_at` (timestamp)
      - `updated_by` (uuid)

  2. Security
    - Enable RLS on `system_settings` table
    - Add policy for admin-only access

  3. Initial Data
    - Insert default onboarding form setting
*/

CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON system_settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('onboarding_form_template', '{"template_id": null, "enabled": false}', 'Form template to use for new customer onboarding')
ON CONFLICT (key) DO NOTHING;