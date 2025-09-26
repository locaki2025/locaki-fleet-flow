-- Inserir dados de exemplo na tabela vehicle_positions para teste do ranking
DO $$
DECLARE
    device_record RECORD;
    base_lat NUMERIC;
    base_lng NUMERIC;
    i INTEGER;
    start_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Para cada device, criar trajetos de exemplo
    FOR device_record IN 
        SELECT id, user_id, vehicle_plate 
        FROM public.devices 
        WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = user_id)
    LOOP
        -- Coordenada base em São Paulo
        base_lat := -23.5505 + (random() - 0.5) * 0.2;
        base_lng := -46.6333 + (random() - 0.5) * 0.2;
        start_time := now() - interval '7 days';
        
        -- Criar 30 pontos de trajeto ao longo de 7 dias (aproximadamente 4 por dia)
        FOR i IN 1..30 LOOP
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
                base_lat + (random() - 0.5) * 0.005, -- Pequena variação na latitude
                base_lng + (random() - 0.5) * 0.005, -- Pequena variação na longitude
                15 + random() * 50, -- Velocidade entre 15-65 km/h
                start_time + interval '5 hours' * i -- Posições a cada 5 horas aproximadamente
            );
        END LOOP;
    END LOOP;
END $$;