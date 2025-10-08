-- Adicionar campos de rastreador na tabela vehicles
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS chip_number text,
ADD COLUMN IF NOT EXISTS tracker_model text;