-- Migration: Split customer_name into first_name + last_name
-- Date: 2026-03-24

-- Step 1: Add new columns
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';

-- Step 2: Backfill from customer_name
-- Try to split on first space: "Jan de Vries" → first_name="Jan", last_name="de Vries"
UPDATE repairs 
SET 
  first_name = CASE 
    WHEN customer_name LIKE '% %' THEN SPLIT_PART(customer_name, ' ', 1)
    ELSE ''
  END,
  last_name = CASE 
    WHEN customer_name LIKE '% %' THEN SUBSTRING(customer_name FROM POSITION(' ' IN customer_name) + 1)
    ELSE customer_name
  END
WHERE first_name = '' OR first_name IS NULL;

-- Step 3: Add WeFact toggle column (default true for backwards compat)
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS send_to_wefact BOOLEAN DEFAULT true;

-- Note: We keep customer_name for backwards compatibility.
-- Going forward, customer_name = first_name + ' ' + last_name (computed on save).
