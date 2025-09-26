-- Inserir dados de exemplo na tabela vehicle_positions para teste do ranking
-- Usando INSERT simples com dados diretos

-- Inserir posições de exemplo para devices existentes
DO $$
DECLARE
    device_record RECORD;
    base_lat NUMERIC;
    base_lng NUMERIC;
    i INTEGER;
    position_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Para cada device, criar trajetos de exemplo
    FOR device_record IN 
        SELECT id, user_id, vehicle_plate 
        FROM public.devices 
        WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = user_id)
        LIMIT 5 -- Limitar para evitar muitos dados
    LOOP
        base_lat := -23.5505;
        base_lng := -46.6333;
        
        -- Criar 20 pontos de trajeto
        FOR i IN 1..20 LOOP
            position_time := now() - interval '1 day' * (7 - i * 0.35);
            
            INSERT INTO public.vehicle_positions (
                user_id, 
                device_id, 
                vehicle_plate, 
                latitude, 
                longitude, 
                speed, 
                timestamp
            )
            VALUES (
                device_record.user_id,
                device_record.id,
                device_record.vehicle_plate,
                base_lat + (random() - 0.5) * 0.01,
                base_lng + (random() - 0.5) * 0.01,
                20 + random() * 40,
                position_time
            );
        END LOOP;
    END LOOP;
END $$;