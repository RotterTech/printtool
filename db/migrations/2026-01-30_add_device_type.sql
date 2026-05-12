-- Migration: Add device_type column to repairs table
-- Date: 2026-01-30
-- Description: Adds device_type column to support different device types (laptop, desktop, printer, console, tablet, telefoon)

-- Add device_type column with default 'laptop' for existing records
ALTER TABLE repairs 
ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) DEFAULT 'laptop';

-- Update existing records (optional - set all existing to laptop)
UPDATE repairs SET device_type = 'laptop' WHERE device_type IS NULL;

-- Create index for device_type column for faster filtering
CREATE INDEX IF NOT EXISTS idx_repairs_device_type ON repairs(device_type);

-- Verify the change
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'repairs' AND column_name = 'device_type';
