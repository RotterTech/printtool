-- Add improvement_notes and customer_email columns to apk_maintenance
-- Run this migration: psql -U postgres -d printtool -f db/migrations/018_apk_email_fields.sql

ALTER TABLE apk_maintenance 
ADD COLUMN IF NOT EXISTS improvement_notes TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN apk_maintenance.improvement_notes IS 'Notes about recommended improvements for the customer';
COMMENT ON COLUMN apk_maintenance.customer_email IS 'Email address to send APK report to';
