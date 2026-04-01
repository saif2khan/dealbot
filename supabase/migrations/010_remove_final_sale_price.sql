-- Remove unused final_sale_price column from items table
ALTER TABLE items DROP COLUMN IF EXISTS final_sale_price;
