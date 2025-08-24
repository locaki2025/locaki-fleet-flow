-- Update functions to have proper search_path security
-- Check for existing functions and update their search_path
DO $$
DECLARE
    func_name text;
BEGIN
    -- Set search_path for any existing trigger functions
    FOR func_name IN
        SELECT proname 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.prokind = 'f'
    LOOP
        -- Update function to have secure search_path
        EXECUTE format('ALTER FUNCTION public.%I SET search_path = public', func_name);
    END LOOP;
END $$;