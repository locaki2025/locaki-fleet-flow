-- Add unique constraint to fatura_id in boletos table for proper upsert
-- This allows us to sync invoices from Cora API and keep them updated

-- First, handle any existing duplicates by keeping only the most recent record
DELETE FROM boletos a
WHERE a.id IN (
  SELECT id
  FROM (
    SELECT id, fatura_id,
           ROW_NUMBER() OVER (PARTITION BY fatura_id ORDER BY created_at DESC) as rn
    FROM boletos
    WHERE fatura_id IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- Now add the unique constraint
ALTER TABLE boletos 
ADD CONSTRAINT boletos_fatura_id_unique UNIQUE (fatura_id);