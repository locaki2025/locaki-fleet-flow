-- Fix security warnings by setting search_path for functions (without dropping dependencies)

-- Update existing function with proper search_path (don't drop it due to triggers)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;