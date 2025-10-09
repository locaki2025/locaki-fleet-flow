-- Add name field to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN name TEXT;

-- Add model field to devices table
ALTER TABLE public.devices 
ADD COLUMN model TEXT;