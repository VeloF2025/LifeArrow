/*
  # Create form templates table

  1. New Tables
    - `form_templates`
      - `id` (text, primary key)
      - `name` (text)
      - `description` (text)
      - `fields` (jsonb) - Array of form field definitions
      - `settings` (jsonb) - Form configuration settings
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `form_templates` table
    - Add policies for admin and staff access
*/

CREATE TABLE IF NOT EXISTS form_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin and staff can manage form templates"
  ON form_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_form_templates_created_by ON form_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_form_templates_created_at ON form_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_form_templates_name ON form_templates(name);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_form_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON form_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_form_templates_updated_at();