-- ============================================================================
-- 🎒 ACCESSOIRES TOEVOEGEN AAN REPAIRS
-- Migration: 2026-01-30
-- ============================================================================

-- Add accessories column to repairs table
ALTER TABLE repairs 
ADD COLUMN IF NOT EXISTS accessories JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN repairs.accessories IS 
'JSONB array of accessories: [{type: string, label: string, quantity: number, notes: string}]';

-- Example usage:
-- [
--   {"type": "adapter", "label": "Adapter/Oplader", "quantity": 1, "notes": "65W USB-C"},
--   {"type": "tas", "label": "Laptoptas", "quantity": 1, "notes": "Zwart"}
-- ]

-- Create index for querying accessories
CREATE INDEX IF NOT EXISTS idx_repairs_accessories 
ON repairs USING gin (accessories);

-- ============================================================================
-- 🎨 BRAND COLORS (for companies - optional custom colors)
-- ============================================================================

-- Add brand_colors column to companies table (for custom brand colors per company)
-- This is optional - if not set, defaults from config.ts will be used
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN companies.brand_colors IS 
'Custom brand colors per company: {"Lenovo": "#E2231A", "HP": "#0096D6"}';
