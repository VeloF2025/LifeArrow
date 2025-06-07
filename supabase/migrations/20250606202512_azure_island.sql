/*
  # Add custom form data column to client onboarding

  1. Changes
    - Add `custom_form_data` column to store dynamic form submissions
    - Add `custom_form_template_id` to track which template was used
    - Add index for better query performance
*/

-- Add columns for custom form data
ALTER TABLE client_onboarding_data 
ADD COLUMN IF NOT EXISTS custom_form_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS custom_form_template_id text;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_onboarding_custom_form_data 
ON client_onboarding_data USING gin (custom_form_data);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_custom_form_template_id 
ON client_onboarding_data(custom_form_template_id);

-- Add foreign key constraint to form templates (optional, allows null)
ALTER TABLE client_onboarding_data 
ADD CONSTRAINT fk_custom_form_template 
FOREIGN KEY (custom_form_template_id) 
REFERENCES form_templates(id) 
ON DELETE SET NULL;