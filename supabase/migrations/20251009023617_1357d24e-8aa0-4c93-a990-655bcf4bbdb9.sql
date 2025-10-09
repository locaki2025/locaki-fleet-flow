-- Add imei column to vehicles table
ALTER TABLE public.vehicles
ADD COLUMN imei TEXT;

-- Migrate existing imei data from devices to vehicles (correlate by vehicle_id)
UPDATE public.vehicles v
SET imei = d.imei
FROM public.devices d
WHERE d.vehicle_id = v.id
AND d.imei IS NOT NULL;

-- Remove imei column from devices table
ALTER TABLE public.devices
DROP COLUMN imei;

-- Add index for better query performance on vehicles.imei
CREATE INDEX idx_vehicles_imei ON public.vehicles(imei);