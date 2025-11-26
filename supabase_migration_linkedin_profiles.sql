-- Create table for storing LinkedIn profile data
-- Run this migration in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS customer_linkedin_profiles (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL UNIQUE,
  company_name TEXT,
  position TEXT,
  headline TEXT,
  profile_photo_url TEXT,
  tenure_months INTEGER,
  linkedin_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on customer_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_linkedin_profiles_customer_name 
  ON customer_linkedin_profiles(customer_name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_customer_linkedin_profiles_updated_at
  BEFORE UPDATE ON customer_linkedin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE customer_linkedin_profiles IS 'Stores LinkedIn profile data for customers, fetched via Apify when quotes are created';

