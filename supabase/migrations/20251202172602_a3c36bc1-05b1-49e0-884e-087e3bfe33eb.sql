-- Allow all authenticated users to view tenant config (map settings, API keys, etc.)
DROP POLICY IF EXISTS "Users can manage their own config" ON public.tenant_config;

-- Users can view all tenant configs
CREATE POLICY "Authenticated users can view all tenant config"
ON public.tenant_config
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can still only manage (insert/update/delete) their own config
CREATE POLICY "Users can insert their own config"
ON public.tenant_config
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own config"
ON public.tenant_config
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own config"
ON public.tenant_config
FOR DELETE
USING (auth.uid() = user_id);