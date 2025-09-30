-- Adicionar coluna para armazenar o ID do Rastrosystem
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS rastrosystem_id TEXT UNIQUE;

-- Criar índice para melhorar performance de buscas por rastrosystem_id
CREATE INDEX IF NOT EXISTS idx_customers_rastrosystem_id ON public.customers(rastrosystem_id);