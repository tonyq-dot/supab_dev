create table if not exists bot_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  level text,
  message text,
  details jsonb
);
