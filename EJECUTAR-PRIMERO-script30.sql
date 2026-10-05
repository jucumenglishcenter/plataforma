-- ════════════════════════════════════════════════════════════════════
-- Script 30 · 💳 Control de pagos (avisos, pausa, montos por alumno)
-- JUCUM English Center · oct 2026
-- Ejecutar UNA vez en Supabase → SQL Editor (es idempotente).
-- EJECUTAR ANTES de subir la entrega control-pagos-2026-10-01.
-- ════════════════════════════════════════════════════════════════════
-- pay_status = UNA fila por alumno con lo que decide la administradora.
--   Si un alumno NO tiene fila → todo normal (nunca se le avisa por error).
--   El control general (interruptor, días de aviso, día de pago por grupo)
--   vive en app_settings, clave 'payment_control' (tabla del script 19).

create table if not exists pay_status (
  student_id      text primary key,
  debtor          boolean default false,   -- marcado A MANO como deudor
  notice_start    date,                    -- día (Perú) en que se ENVIÓ el aviso
  closed_manual   boolean default false,   -- pausado a mano sin esperar
  extension_until date,                    -- prórroga: no ve avisos hasta esta fecha
  paid_until      date,                    -- pagado hasta (lo pone la admin al registrar)
  amount          numeric,                 -- monto especial (null = general del nivel)
  amount_why      text default '',
  pay_day         integer,                 -- día propio (null = el del grupo)
  join_date       date,                    -- empezó (si ingresó después del inicio)
  exempt          boolean default false,   -- beca / convenio: nunca recibe avisos
  teacher_allow   integer default 1,       -- vistas permitidas al profesor estando en pausa
  teacher_views   integer default 0,       -- vistas usadas
  note            text default '',
  updated_at      timestamptz default now(),
  updated_by      text default ''
);
alter table pay_status enable row level security;
do $$ begin
  create policy "pay_status open" on pay_status for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Bitácora: quién hizo qué (marcar, avisar, pagó, prórroga, pausar, reabrir, vistas)
create table if not exists pay_log (
  id          bigserial primary key,
  at          timestamptz default now(),
  who         text default '',
  student_id  text default '',
  action      text default '',
  detail      text default ''
);
alter table pay_log enable row level security;
do $$ begin
  create policy "pay_log open" on pay_log for all using (true) with check (true);
exception when duplicate_object then null; end $$;
create index if not exists pay_log_at_idx on pay_log (at desc);

-- Índice para leer rápido los pagos de UN alumno (sin bajar capturas de todos)
create index if not exists payments_student_idx on payments (student_id);
