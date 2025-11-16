-- Add taxa_juros column to boletos table
ALTER TABLE public.boletos
ADD COLUMN IF NOT EXISTS taxa_juros numeric DEFAULT 3.67;

COMMENT ON COLUMN public.boletos.taxa_juros IS 'Taxa de juros mensal aplicada após o vencimento (%)';
