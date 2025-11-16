-- Schedule automatic sync of Cora invoices daily at 3 AM UTC (6 AM Brasília time)
-- This cron job will run the scheduled_sync action in the cora-webhook edge function
SELECT cron.schedule(
  'cora-invoices-daily-sync',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://pfkiedrazodgsssohwzp.supabase.co/functions/v1/cora-webhook',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBma2llZHJhem9kZ3Nzc29od3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTcyMjYsImV4cCI6MjA3MTUzMzIyNn0.F9DFpPdkCuN2QQJDawQ0rJMfO3fvG8_AtaBnMP_6beY"}'::jsonb,
        body:='{"action": "scheduled_sync"}'::jsonb
    ) as request_id;
  $$
);