-- Run this once in the Supabase SQL Editor.
create table if not exists public.kv (
  key text primary key,
  value text not null
);

-- Lock the table: only the Edge Function (which uses the service role key) can read or write it.
alter table public.kv enable row level security;
