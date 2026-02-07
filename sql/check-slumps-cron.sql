-- Schedule: daily at 00:00 UTC
-- Replace <project-ref> with your Supabase project ref
select
  cron.schedule(
    'check-slumps-daily',
    '0 0 * * *',
    $$
    select
      net.http_post(
        url := 'https://<project-ref>.functions.supabase.co/check-slumps',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) as request_id;
    $$
  );
