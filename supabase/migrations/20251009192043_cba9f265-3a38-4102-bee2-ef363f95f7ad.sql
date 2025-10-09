-- Add unique constraints for rastrosystem_id
-- Para vehicles: unique por user_id + rastrosystem_id
ALTER TABLE public.vehicles 
ADD CONSTRAINT vehicles_user_rastrosystem_id_unique 
UNIQUE (user_id, rastrosystem_id);

-- Para devices: unique por user_id + rastrosystem_id
ALTER TABLE public.devices 
ADD CONSTRAINT devices_user_rastrosystem_id_unique 
UNIQUE (user_id, rastrosystem_id);