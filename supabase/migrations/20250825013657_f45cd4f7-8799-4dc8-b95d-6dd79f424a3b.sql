-- Add new columns to contracts table to match the updated form
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS diaria numeric,
ADD COLUMN IF NOT EXISTS caucionamento numeric,
ADD COLUMN IF NOT EXISTS data_inicio_completa timestamp with time zone,
ADD COLUMN IF NOT EXISTS data_fim_completa timestamp with time zone,
ADD COLUMN IF NOT EXISTS local_entrega text,
ADD COLUMN IF NOT EXISTS local_devolucao text,
ADD COLUMN IF NOT EXISTS combustivel_entrega text,
ADD COLUMN IF NOT EXISTS combustivel_devolucao text,
ADD COLUMN IF NOT EXISTS km_permitidos_dia numeric,
ADD COLUMN IF NOT EXISTS multa_km_excedente numeric,
ADD COLUMN IF NOT EXISTS multimeios_inclusos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS capacete_inclusos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cadeado_inclusos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS capa_banco_inclusos boolean DEFAULT false;