-- Add sale-related columns to refurbished_stock table
-- Run this manually in Supabase SQL editor

-- Add customer link (no FK constraint since customers table may not exist)
ALTER TABLE refurbished_stock ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Add sale info
ALTER TABLE refurbished_stock ADD COLUMN IF NOT EXISTS sold_to_customer TEXT;
ALTER TABLE refurbished_stock ADD COLUMN IF NOT EXISTS sold_price NUMERIC(10, 2);
ALTER TABLE refurbished_stock ADD COLUMN IF NOT EXISTS sold_date TIMESTAMPTZ;
ALTER TABLE refurbished_stock ADD COLUMN IF NOT EXISTS sold_notes TEXT;

-- Create index for customer lookups
CREATE INDEX IF NOT EXISTS idx_refurbished_stock_customer_id ON refurbished_stock(customer_id);

-- Also add customer_id to pulled_parts for tracking which customer used a part
ALTER TABLE pulled_parts ADD COLUMN IF NOT EXISTS customer_id UUID;
CREATE INDEX IF NOT EXISTS idx_pulled_parts_customer_id ON pulled_parts(customer_id);
