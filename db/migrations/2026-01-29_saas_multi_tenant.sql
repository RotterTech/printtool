-- ============================================================================
-- SaaS Multi-Tenant Setup
-- Date: 2026-01-29
-- Description: Creates company structure for multi-tenant SaaS with 7-day trial
-- ============================================================================

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,  -- voor subdomain: bedrijfsnaam-lowercase
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Trial & Plan info
  trial_started TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_ends TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  plan VARCHAR(50) DEFAULT 'trial',  -- trial, basic, pro, enterprise
  is_active BOOLEAN DEFAULT true,
  
  -- Company settings (prijzen, merken, etc - stored as JSON)
  settings JSONB DEFAULT '{
    "custom_brand_models": null,
    "custom_prices": null,
    "wefact_api_key": null,
    "label_settings": {},
    "theme": "default"
  }'::jsonb,
  
  -- Billing info (voor later)
  billing_email VARCHAR(255),
  vat_number VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add company_id to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 3. Add company_id to repairs table
ALTER TABLE repairs 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 4. Add company_id to other tables (if they exist)
DO $$ 
BEGIN
  -- APK/Maintenance table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'apk_maintenance') THEN
    ALTER TABLE apk_maintenance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
  
  -- Parts table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parts') THEN
    ALTER TABLE parts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
  
  -- Refurbished table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'refurbished') THEN
    ALTER TABLE refurbished ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON companies(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_repairs_company ON repairs(company_id);

-- 6. Enable Row Level Security on companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own company
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Policy: Only owner can update company
CREATE POLICY "Owner can update company" ON companies
  FOR UPDATE USING (owner_id = auth.uid());

-- Policy: Anyone can insert (for signup)
CREATE POLICY "Anyone can create company" ON companies
  FOR INSERT WITH CHECK (true);

-- 7. Update RLS on repairs to scope by company
DROP POLICY IF EXISTS "Users can only see own company repairs" ON repairs;
CREATE POLICY "Users can only see own company repairs" ON repairs
  FOR ALL USING (
    company_id IS NULL OR  -- Legacy data without company
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- 8. Helper function to get current user's company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 9. Helper function to check if trial is active
CREATE OR REPLACE FUNCTION is_trial_active(company_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT 
    CASE 
      WHEN plan != 'trial' THEN true  -- Paid plan, always active
      WHEN trial_ends > NOW() THEN true  -- Trial not expired
      ELSE false  -- Trial expired
    END
  FROM companies WHERE id = company_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- 10. Trigger to update updated_at on companies
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES (run these to check the migration)
-- ============================================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'companies';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'repairs' AND column_name = 'company_id';
