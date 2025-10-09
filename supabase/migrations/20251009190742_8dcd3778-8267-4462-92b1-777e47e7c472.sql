-- Adjust uniqueness and foreign key to be per user + rastrosystem_id
-- 1) Drop existing FK on devices (if exists)
ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS fk_devices_vehicles_rastrosystem;

-- 2) Drop existing unique constraint on vehicles.rastrosystem_id (if exists)
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS unique_vehicles_rastrosystem_id;

-- 3) Create composite unique constraint on vehicles (user_id, rastrosystem_id)
ALTER TABLE public.vehicles
ADD CONSTRAINT vehicles_user_rastrosystem_unique UNIQUE (user_id, rastrosystem_id);

-- 4) Create composite FK from devices (user_id, rastrosystem_id) -> vehicles (user_id, rastrosystem_id)
ALTER TABLE public.devices
ADD CONSTRAINT fk_devices_vehicles_user_rastrosystem
FOREIGN KEY (user_id, rastrosystem_id)
REFERENCES public.vehicles(user_id, rastrosystem_id)
ON DELETE CASCADE;