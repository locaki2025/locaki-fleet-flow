-- Tabela para configurações do tenant
CREATE TABLE IF NOT EXISTS public.tenant_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  config_key text NOT NULL,
  config_value jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, config_key)
);

-- Enable RLS
ALTER TABLE public.tenant_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own config" 
ON public.tenant_config 
FOR ALL 
USING (auth.uid() = user_id);

-- Tabela para logs de integração
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  service text NOT NULL,
  operation text NOT NULL,
  request_data jsonb,
  response_data jsonb,
  status text NOT NULL,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own logs" 
ON public.integration_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage logs" 
ON public.integration_logs 
FOR ALL 
USING (auth.role() = 'service_role');

-- Adicionar trigger para updated_at na tenant_config
CREATE TRIGGER update_tenant_config_updated_at
BEFORE UPDATE ON public.tenant_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar novos campos na tabela boletos para melhor controle
ALTER TABLE public.boletos 
ADD COLUMN IF NOT EXISTS contrato_origem_id uuid,
ADD COLUMN IF NOT EXISTS tipo_cobranca text DEFAULT 'avulsa',
ADD COLUMN IF NOT EXISTS tentativas_cobranca integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_proxima_tentativa timestamp with time zone;