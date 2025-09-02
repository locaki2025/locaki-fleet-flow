-- Adicionar campos de CNH na tabela customers
ALTER TABLE public.customers 
ADD COLUMN cnh_expiry_date DATE,
ADD COLUMN cnh_category TEXT,
ADD COLUMN cnh_attachment_url TEXT;