-- Add customer_phone and klantnummer columns to apk_maintenance
-- Run this migration: psql -U postgres -d printtool -f db/migrations/019_apk_customer_fields.sql
-- Or via Supabase SQL editor

ALTER TABLE apk_maintenance 
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS klantnummer TEXT;

-- Add comments for documentation
COMMENT ON COLUMN apk_maintenance.customer_phone IS 'Customer phone number for contact';
COMMENT ON COLUMN apk_maintenance.klantnummer IS 'Customer number from WeFact or internal system';
