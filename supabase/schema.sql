create extension if not exists "pgcrypto";

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text not null,
  experience_level text not null check (experience_level in ('easy', 'moderate', 'hard')),
  days_per_week integer not null check (days_per_week between 2 and 6),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  started_at timestamptz,
  structure jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  session_key text not null,
  exercise_name text not null,
  performed_sets text not null,
  effort integer not null check (effort between 1 and 10),
  notes text not null default '',
  completed_at timestamptz not null default timezone('utc', now())
);

alter table programs disable row level security;
alter table exercise_logs disable row level security;

create index if not exists exercise_logs_program_id_completed_at_idx
  on exercise_logs(program_id, completed_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists programs_set_updated_at on programs;
create trigger programs_set_updated_at
before update on programs
for each row
execute procedure set_updated_at();
