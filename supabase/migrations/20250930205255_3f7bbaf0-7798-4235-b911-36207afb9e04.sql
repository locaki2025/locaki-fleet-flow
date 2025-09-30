-- Limpar tabelas relacionadas primeiro
DELETE FROM public.multas_transito;
DELETE FROM public.contratos;
DELETE FROM public.vehicle_positions;
DELETE FROM public.devices;

-- Agora limpar veículos e clientes
DELETE FROM public.vehicles;
DELETE FROM public.customers;