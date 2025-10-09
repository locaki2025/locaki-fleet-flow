-- Remove the vehicle_id column from devices table
ALTER TABLE public.devices DROP COLUMN IF EXISTS vehicle_id;

-- Add rastrosystem_id column to devices table
ALTER TABLE public.devices ADD COLUMN rastrosystem_id text;

-- Remove duplicate vehicles keeping only the oldest one for each rastrosystem_id
DELETE FROM public.vehicles a
USING public.vehicles b
WHERE a.rastrosystem_id = b.rastrosystem_id 
  AND a.rastrosystem_id IS NOT NULL
  AND a.created_at > b.created_at;

-- Set NULL for vehicles without rastrosystem_id to allow unique constraint
-- (This ensures we can create a unique constraint that allows multiple NULLs)

-- Create unique constraint on vehicles.rastrosystem_id 
-- Note: In PostgreSQL, NULL values are considered distinct, so multiple NULLs are allowed
ALTER TABLE public.vehicles 
ADD CONSTRAINT unique_vehicles_rastrosystem_id 
UNIQUE(rastrosystem_id);

-- Create foreign key constraint linking devices.rastrosystem_id to vehicles.rastrosystem_id
ALTER TABLE public.devices 
ADD CONSTRAINT fk_devices_vehicles_rastrosystem 
FOREIGN KEY (rastrosystem_id) 
REFERENCES public.vehicles(rastrosystem_id) 
ON DELETE SET NULL;