-- Fix product_html_generated table to use UUID for product_id
-- This migration aligns the table with the products table which uses UUID

-- Step 1: Drop existing data (as we cannot convert bigint to UUID)
TRUNCATE TABLE product_html_generated;

-- Step 2: Change product_id column type to UUID
ALTER TABLE product_html_generated
ALTER COLUMN product_id TYPE UUID USING product_id::text::uuid;

-- Step 3: Verify the change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'product_html_generated'
AND column_name = 'product_id';
