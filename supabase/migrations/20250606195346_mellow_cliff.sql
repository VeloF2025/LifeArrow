/*
  # Enhanced Client Onboarding Schema

  1. New Tables
    - Enhanced `client_onboarding_data` table with comprehensive fields
    - Support for all form fields from the Life Arrow Contact Information form
    
  2. Features
    - Complete contact information storage
    - Personal and employment details
    - Comprehensive health questionnaire data
    - Transformation goals and referral tracking
    - Terms acceptance and treatment centre selection
    
  3. Security
    - RLS policies for data protection
    - Proper indexing for performance
*/

-- Drop existing client_onboarding_data table if it exists to recreate with new schema
DROP TABLE IF EXISTS client_onboarding_data;

-- Create enhanced client onboarding data table
CREATE TABLE client_onboarding_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Contact Information (Page 1)
  id_number text,
  gender text CHECK (gender IN ('male', 'female')),
  address_1 text,
  address_2 text,
  suburb text,
  city text,
  province text CHECK (province IN ('Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape')),
  postal_code text,
  country text DEFAULT 'South Africa',
  preferred_contact text CHECK (preferred_contact IN ('email', 'whatsapp', 'phone')),
  
  -- Personal Information (Page 2)
  marital_status text CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'other')),
  marital_status_other text,
  employment_status text CHECK (employment_status IN ('employed', 'unemployed', 'student', 'retired', 'disabled', 'sabbatical', 'other')),
  employment_status_other text,
  current_employer text,
  occupation text,
  academic_institution text,
  
  -- Health Questionnaire (Page 3) - Stored as JSONB for flexibility
  current_medications jsonb DEFAULT '[]'::jsonb,
  chronic_conditions jsonb DEFAULT '[]'::jsonb,
  current_treatments jsonb DEFAULT '[]'::jsonb,
  previous_procedures jsonb DEFAULT '[]'::jsonb,
  medical_implants jsonb DEFAULT '[]'::jsonb,
  
  -- General Information (Page 4)
  transformation_reasons text[] DEFAULT '{}',
  transformation_reasons_other text,
  hear_about_us text CHECK (hear_about_us IN ('referral', 'social_media', 'website', 'advertisement', 'event', 'healthcare', 'other')),
  hear_about_us_other text,
  contact_image text, -- File path or URL
  
  -- Terms & Conditions (Page 5)
  terms_accepted boolean DEFAULT false,
  
  -- Treatment Centre (Page 6)
  treatment_centre text,
  
  -- Legacy fields for backward compatibility
  medications text,
  allergies text,
  previous_surgeries text,
  primary_goals text[] DEFAULT '{}',
  activity_level text CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active', 'not_specified')),
  dietary_preferences text,
  marketing_consent boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_client_onboarding_data_client_id ON client_onboarding_data(client_id);
CREATE INDEX idx_client_onboarding_data_id_number ON client_onboarding_data(id_number);
CREATE INDEX idx_client_onboarding_data_treatment_centre ON client_onboarding_data(treatment_centre);
CREATE INDEX idx_client_onboarding_data_created_at ON client_onboarding_data(created_at);

-- Enable RLS
ALTER TABLE client_onboarding_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clients can view own onboarding data" ON client_onboarding_data
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can insert own onboarding data" ON client_onboarding_data
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update own onboarding data" ON client_onboarding_data
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Staff and admin can manage all onboarding data" ON client_onboarding_data
  FOR ALL TO authenticated
  USING (user_has_role('staff'));

-- Create trigger for updated_at
CREATE TRIGGER update_client_onboarding_data_updated_at
  BEFORE UPDATE ON client_onboarding_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easy data access with joined profile information
CREATE OR REPLACE VIEW client_onboarding_view AS
SELECT 
  cod.*,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.date_of_birth,
  c.client_code,
  c.emergency_contact
FROM client_onboarding_data cod
JOIN profiles p ON cod.client_id = p.id
LEFT JOIN clients c ON c.profile_id = p.id;

-- Grant access to the view
GRANT SELECT ON client_onboarding_view TO authenticated;

-- Create helper functions for data analysis
CREATE OR REPLACE FUNCTION get_onboarding_stats()
RETURNS TABLE(
  total_clients bigint,
  completed_onboarding bigint,
  by_province text,
  province_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM profiles WHERE role = 'client') as total_clients,
    (SELECT COUNT(*) FROM client_onboarding_data) as completed_onboarding,
    COALESCE(cod.province, 'Not Specified') as by_province,
    COUNT(*) as province_count
  FROM client_onboarding_data cod
  GROUP BY cod.province
  ORDER BY province_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_onboarding_stats() TO authenticated;

-- Create function to validate South African ID number
CREATE OR REPLACE FUNCTION validate_sa_id_number(id_number text)
RETURNS boolean AS $$
BEGIN
  -- Basic validation: 13 digits
  IF LENGTH(id_number) != 13 OR id_number !~ '^[0-9]+$' THEN
    RETURN false;
  END IF;
  
  -- Additional validation logic can be added here
  -- (Luhn algorithm, date validation, etc.)
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_sa_id_number(text) TO authenticated;

-- Add constraint to validate ID numbers
ALTER TABLE client_onboarding_data 
ADD CONSTRAINT valid_sa_id_number 
CHECK (id_number IS NULL OR validate_sa_id_number(id_number));

-- Create indexes on JSONB fields for better query performance
CREATE INDEX idx_client_onboarding_medications ON client_onboarding_data USING GIN (current_medications);
CREATE INDEX idx_client_onboarding_conditions ON client_onboarding_data USING GIN (chronic_conditions);
CREATE INDEX idx_client_onboarding_treatments ON client_onboarding_data USING GIN (current_treatments);

-- Insert sample data for testing (optional)
DO $$
BEGIN
  -- Only insert if there are existing profiles to reference
  IF EXISTS (SELECT 1 FROM profiles WHERE role = 'client' LIMIT 1) THEN
    INSERT INTO client_onboarding_data (
      client_id,
      id_number,
      gender,
      province,
      transformation_reasons,
      hear_about_us,
      terms_accepted,
      treatment_centre,
      activity_level
    )
    SELECT 
      id,
      '1234567890123',
      'male',
      'Gauteng',
      ARRAY['Physical Health & Fitness', 'Personal Development & Self-Improvement'],
      'website',
      true,
      'Pretoria - Life Arrow Silverwoods',
      'moderate'
    FROM profiles 
    WHERE role = 'client' 
    AND NOT EXISTS (
      SELECT 1 FROM client_onboarding_data WHERE client_id = profiles.id
    )
    LIMIT 1;
    
    RAISE NOTICE 'Sample onboarding data created for testing';
  END IF;
END $$;

-- Final verification
DO $$
DECLARE
  table_exists boolean;
  policy_count integer;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'client_onboarding_data'
  ) INTO table_exists;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'client_onboarding_data';
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'client_onboarding_data table was not created successfully';
  END IF;
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Not all RLS policies were created successfully';
  END IF;
  
  RAISE NOTICE 'Enhanced client onboarding schema created successfully';
  RAISE NOTICE 'Table: client_onboarding_data with % RLS policies', policy_count;
  RAISE NOTICE 'View: client_onboarding_view for easy data access';
  RAISE NOTICE 'Functions: get_onboarding_stats(), validate_sa_id_number()';
END $$;