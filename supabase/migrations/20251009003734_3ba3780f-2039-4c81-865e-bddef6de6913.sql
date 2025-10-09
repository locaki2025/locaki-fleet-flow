-- Adicionar coluna vehicle_id na tabela devices
ALTER TABLE public.devices
ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_devices_vehicle_id ON public.devices(vehicle_id);

-- Atualizar registros existentes para popular vehicle_id baseado em vehicle_plate
UPDATE public.devices d
SET vehicle_id = v.id
FROM public.vehicles v
WHERE d.vehicle_plate = v.plate
AND d.user_id = v.user_id
AND d.vehicle_id IS NULL;