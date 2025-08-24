-- Enable realtime for contratos table
ALTER TABLE public.contratos REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.contratos;