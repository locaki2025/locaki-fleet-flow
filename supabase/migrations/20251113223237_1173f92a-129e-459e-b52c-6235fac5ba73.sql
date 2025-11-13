-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to sync Cora transactions every hour
SELECT cron.schedule(
  'cora-auto-sync-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://pfkiedrazodgsssohwzp.supabase.co/functions/v1/cora-webhook',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBma2llZHJhem9kZ3Nzc29od3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTcyMjYsImV4cCI6MjA3MTUzMzIyNn0.F9DFpPdkCuN2QQJDawQ0rJMfO3fvG8_AtaBnMP_6beY"}'::jsonb,
        body:='{"action": "auto_sync"}'::jsonb
    ) as request_id;
  $$
);

-- View all scheduled cron jobs
-- SELECT * FROM cron.job;

-- To unschedule the job in the future, use:
-- SELECT cron.unschedule('cora-auto-sync-hourly');