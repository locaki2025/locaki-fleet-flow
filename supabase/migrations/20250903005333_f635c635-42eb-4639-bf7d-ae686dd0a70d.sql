-- Configurar cron job para sincronização automática do Cora a cada 30 minutos
SELECT cron.schedule(
  'cora-auto-sync',
  '*/30 * * * *', -- A cada 30 minutos
  $$
  SELECT
    net.http_post(
        url:='https://pfkiedrazodgsssohwzp.supabase.co/functions/v1/cora-webhook',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBma2llZHJhem9kZ3Nzc29od3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTcyMjYsImV4cCI6MjA3MTUzMzIyNn0.F9DFpPdkCuN2QQJDawQ0rJMfO3fvG8_AtaBnMP_6beY"}'::jsonb,
        body:='{"action": "auto_sync"}'::jsonb
    ) as request_id;
  $$
);