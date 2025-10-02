-- Criar bucket para CNH dos clientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('cnh-clientes', 'cnh-clientes', false);

-- Políticas RLS para o bucket cnh-clientes
-- Usuários autenticados podem ver seus próprios arquivos
CREATE POLICY "Users can view their own CNH files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'cnh-clientes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Usuários autenticados podem fazer upload de seus próprios arquivos
CREATE POLICY "Users can upload their own CNH files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cnh-clientes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Usuários autenticados podem atualizar seus próprios arquivos
CREATE POLICY "Users can update their own CNH files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'cnh-clientes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Usuários autenticados podem excluir seus próprios arquivos
CREATE POLICY "Users can delete their own CNH files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'cnh-clientes' AND auth.uid()::text = (storage.foldername(name))[1]);