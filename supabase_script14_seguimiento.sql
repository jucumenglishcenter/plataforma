-- ════════════════════════════════════════════════════════════════════
-- Script 14 · Seguimiento por historia + meta diaria multi-equipo
-- JUCUM English Center · jul 2026
-- Ejecutar UNA vez en Supabase → SQL Editor (es idempotente).
-- ════════════════════════════════════════════════════════════════════

-- Qué historia/audio completó cada alumno dentro de un material (S1..S4)
create table if not exists activity_parts (
  user_id      text not null,
  module_id    text not null,
  activity_id  text not null,
  part         integer not null,
  score        integer,
  minutes      integer default 0,
  completed_at timestamptz default now(),
  primary key (user_id, module_id, activity_id, part)
);
alter table activity_parts enable row level security;
do $$ begin
  create policy "activity_parts open" on activity_parts for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Minutos practicados POR DÍA y por actividad (meta diaria en cualquier equipo)
create table if not exists daily_sessions (
  user_id     text not null,
  day         date not null,
  module_id   text not null default '',
  activity_id text not null default '',
  kind        text default '',
  minutes     integer default 0,
  updated_at  timestamptz default now(),
  primary key (user_id, day, module_id, activity_id)
);
alter table daily_sessions enable row level security;
do $$ begin
  create policy "daily_sessions open" on daily_sessions for all using (true) with check (true);
exception when duplicate_object then null; end $$;

create index if not exists daily_sessions_day_idx on daily_sessions (day);
create index if not exists activity_parts_user_idx on activity_parts (user_id);
