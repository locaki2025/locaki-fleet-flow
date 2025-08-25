-- Add observacoes column to boletos table to store additional notes and error messages
ALTER TABLE public.boletos 
ADD COLUMN IF NOT EXISTS observacoes TEXT;