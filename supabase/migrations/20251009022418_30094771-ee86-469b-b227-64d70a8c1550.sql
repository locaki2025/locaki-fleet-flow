-- Add vehicle_id column to vehicles table to store Rastrosystem vehicle ID
ALTER TABLE public.vehicles
ADD COLUMN vehicle_id TEXT;

-- Add index for better query performance
CREATE INDEX idx_vehicles_vehicle_id ON public.vehicles(vehicle_id);