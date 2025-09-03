-- Criar tabela para armazenar transações do Banco Cora
CREATE TABLE public.cora_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cora_transaction_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  status TEXT NOT NULL CHECK (status IN ('settled', 'pending', 'failed')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  conciliated BOOLEAN DEFAULT false,
  conciliated_boleto_id UUID,
  raw_data JSONB
);

-- Criar índices para performance
CREATE INDEX idx_cora_transactions_user_id ON public.cora_transactions(user_id);
CREATE INDEX idx_cora_transactions_cora_id ON public.cora_transactions(cora_transaction_id);
CREATE INDEX idx_cora_transactions_date ON public.cora_transactions(transaction_date);
CREATE INDEX idx_cora_transactions_conciliated ON public.cora_transactions(conciliated);
CREATE UNIQUE INDEX idx_cora_transactions_unique ON public.cora_transactions(user_id, cora_transaction_id);

-- Criar tabela para logs de sincronização
CREATE TABLE public.cora_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sync_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  transactions_imported INTEGER DEFAULT 0,
  transactions_conciliated INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para logs
CREATE INDEX idx_cora_sync_logs_user_date ON public.cora_sync_logs(user_id, sync_date DESC);

-- Habilitar RLS
ALTER TABLE public.cora_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cora_sync_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para cora_transactions
CREATE POLICY "Users can view their own Cora transactions" 
ON public.cora_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Cora transactions" 
ON public.cora_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Cora transactions" 
ON public.cora_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Criar políticas RLS para cora_sync_logs
CREATE POLICY "Users can view their own sync logs" 
ON public.cora_sync_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync logs" 
ON public.cora_sync_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_cora_transactions_updated_at
BEFORE UPDATE ON public.cora_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar referência de foreign key para boletos (opcional)
ALTER TABLE public.cora_transactions 
ADD CONSTRAINT fk_cora_transactions_boleto 
FOREIGN KEY (conciliated_boleto_id) 
REFERENCES public.boletos(id) 
ON DELETE SET NULL;