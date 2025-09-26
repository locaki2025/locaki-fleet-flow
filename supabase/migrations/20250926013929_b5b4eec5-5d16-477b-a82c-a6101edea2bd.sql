-- Fix security warnings for the new functions only

-- Drop and recreate distance calculation function with proper search_path
DROP FUNCTION IF EXISTS calculate_distance(NUMERIC, NUMERIC, NUMERIC, NUMERIC);
CREATE OR REPLACE FUNCTION calculate_distance(lat1 NUMERIC, lon1 NUMERIC, lat2 NUMERIC, lon2 NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
    r NUMERIC := 6371; -- Earth's radius in kilometers
    dlat NUMERIC;
    dlon NUMERIC;
    a NUMERIC;
    c NUMERIC;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN r * c;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop and recreate device KM calculation function with proper search_path
DROP FUNCTION IF EXISTS get_device_total_km(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
CREATE OR REPLACE FUNCTION get_device_total_km(device_uuid UUID, start_date TIMESTAMP WITH TIME ZONE, end_date TIMESTAMP WITH TIME ZONE)
RETURNS NUMERIC AS $$
DECLARE
    total_km NUMERIC := 0;
    prev_lat NUMERIC;
    prev_lon NUMERIC;
    curr_lat NUMERIC;
    curr_lon NUMERIC;
    distance NUMERIC;
    position_record RECORD;
BEGIN
    -- Get all positions for the device in the date range, ordered by timestamp
    FOR position_record IN 
        SELECT latitude, longitude 
        FROM public.vehicle_positions 
        WHERE device_id = device_uuid 
        AND timestamp >= start_date 
        AND timestamp <= end_date 
        ORDER BY timestamp ASC
    LOOP
        curr_lat := position_record.latitude;
        curr_lon := position_record.longitude;
        
        -- If we have a previous position, calculate distance
        IF prev_lat IS NOT NULL AND prev_lon IS NOT NULL THEN
            distance := calculate_distance(prev_lat, prev_lon, curr_lat, curr_lon);
            -- Only add distance if it's reasonable (less than 200km between points to avoid GPS errors)
            IF distance <= 200 THEN
                total_km := total_km + distance;
            END IF;
        END IF;
        
        prev_lat := curr_lat;
        prev_lon := curr_lon;
    END LOOP;
    
    RETURN COALESCE(total_km, 0);
END;
$$ LANGUAGE plpgsql SET search_path = public;