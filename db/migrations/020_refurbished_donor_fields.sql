-- Add donor fields to refurbished_stock for tracking who donated/sold the device
-- Run via Supabase SQL Editor or: psql -U postgres -d printtool -f db/migrations/020_refurbished_donor_fields.sql

-- Add donor_id (FK to customers) and donor_name (text for derived/manual)
ALTER TABLE refurbished_stock 
ADD COLUMN IF NOT EXISTS donor_id UUID REFERENCES customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS donor_name TEXT,
ADD COLUMN IF NOT EXISTS donor_email TEXT,
ADD COLUMN IF NOT EXISTS donor_phone TEXT,
ADD COLUMN IF NOT EXISTS donor_klantnummer TEXT;

-- Index for fast lookups by donor
CREATE INDEX IF NOT EXISTS idx_refurbished_donor ON refurbished_stock(donor_id);
CREATE INDEX IF NOT EXISTS idx_refurbished_donor_name ON refurbished_stock(donor_name);

-- Comments
COMMENT ON COLUMN refurbished_stock.donor_id IS 'Customer ID of who donated/sold the device';
COMMENT ON COLUMN refurbished_stock.donor_name IS 'Name of donor (for derived/manual customers)';
COMMENT ON COLUMN refurbished_stock.donor_email IS 'Email of donor';
COMMENT ON COLUMN refurbished_stock.donor_phone IS 'Phone of donor';
COMMENT ON COLUMN refurbished_stock.donor_klantnummer IS 'Customer number of donor (WeFact/internal)';
