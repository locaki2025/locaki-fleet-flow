-- Remover políticas antigas de SELECT que restringem por user_id
DROP POLICY IF EXISTS "Users can view their own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can view their own vehicle positions" ON public.vehicle_positions;
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.vehicles;

-- Criar novas políticas que permitem todos os usuários autenticados visualizarem todos os dados
CREATE POLICY "Authenticated users can view all devices"
ON public.devices
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all vehicle positions"
ON public.vehicle_positions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all vehicles"
ON public.vehicles
FOR SELECT
TO authenticated
USING (true);

-- As políticas de INSERT, UPDATE e DELETE permanecem restritas ao dono dos dados
-- Elas já estão configuradas corretamente nas tabelas