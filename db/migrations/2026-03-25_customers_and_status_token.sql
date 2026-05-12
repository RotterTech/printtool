-- ============================================================
-- Smart Print System: status_token + customers table
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Add status_token to repairs (dynamic, unique per repair)
-- ============================================================
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS status_token uuid DEFAULT gen_random_uuid();

-- Ensure existing repairs get a token
UPDATE repairs SET status_token = gen_random_uuid() WHERE status_token IS NULL;

-- Make it unique and not null
ALTER TABLE repairs ALTER COLUMN status_token SET NOT NULL;
ALTER TABLE repairs ALTER COLUMN status_token SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_repairs_status_token ON repairs(status_token);

-- ============================================================
-- 2. Customers table — CRM dossier
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Identity
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  display_name text GENERATED ALWAYS AS (
    CASE 
      WHEN first_name = '' AND last_name = '' THEN 'Naamloos'
      WHEN first_name = '' THEN last_name
      WHEN last_name = '' THEN first_name
      ELSE first_name || ' ' || last_name
    END
  ) STORED,
  
  -- Contact
  email text,
  phone text,
  
  -- Address
  adres text,
  woonplaats text,
  
  -- External
  klantnummer text,              -- WeFact / eigen nummering
  wefact_debtor_id text,         -- WeFact Debtor ID
  
  -- Notes
  notities text,
  
  -- Meta
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(display_name);
CREATE INDEX IF NOT EXISTS idx_customers_klantnummer ON customers(klantnummer);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON customers FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "customers_insert" ON customers FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "customers_update" ON customers FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "customers_delete" ON customers FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- 3. Link repairs to customers (optional FK)
-- ============================================================
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_repairs_customer ON repairs(customer_id);

-- ============================================================
-- 4. Link refurbished_stock to customers (for sold items)
-- ============================================================
ALTER TABLE refurbished_stock ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_refurbished_customer ON refurbished_stock(customer_id);
