-- Create table for traffic fines management
CREATE TABLE public.multas_transito (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  veiculo_id UUID REFERENCES public.vehicles(id),
  placa TEXT NOT NULL,
  
  -- Infraction details
  infracao TEXT NOT NULL,
  motivo TEXT NOT NULL,
  auto_infracao TEXT,
  tipo_infracao TEXT,
  gravidade TEXT,
  pontuacao INTEGER DEFAULT 0,
  
  -- Dates
  data_infracao DATE NOT NULL,
  data_limite_recurso DATE,
  prazo_indicacao_condutor DATE,
  recebimento_infracao DATE,
  
  -- Financial
  valor_multa NUMERIC NOT NULL,
  valor_com_desconto NUMERIC,
  
  -- Status and control
  situacao TEXT NOT NULL DEFAULT 'aberta',
  orgao_autuador TEXT,
  condutor TEXT,
  endereco TEXT,
  
  -- Business control
  habilitado_faturar BOOLEAN DEFAULT false,
  faturado BOOLEAN DEFAULT false,
  em_posse_cliente BOOLEAN DEFAULT false,
  em_recurso BOOLEAN DEFAULT false,
  
  -- Additional info
  justificativa TEXT,
  observacoes TEXT,
  documentos JSONB DEFAULT '[]'::jsonb,
  
  -- Integration
  serpro_id TEXT UNIQUE,
  origem TEXT DEFAULT 'e-Multas',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.multas_transito ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own traffic fines" 
ON public.multas_transito 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own traffic fines" 
ON public.multas_transito 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own traffic fines" 
ON public.multas_transito 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own traffic fines" 
ON public.multas_transito 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_multas_transito_updated_at
BEFORE UPDATE ON public.multas_transito
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_multas_transito_user_id ON public.multas_transito(user_id);
CREATE INDEX idx_multas_transito_placa ON public.multas_transito(placa);
CREATE INDEX idx_multas_transito_situacao ON public.multas_transito(situacao);
CREATE INDEX idx_multas_transito_data_infracao ON public.multas_transito(data_infracao);