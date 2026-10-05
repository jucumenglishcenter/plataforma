-- ════════════════════════════════════════════════════════════════════
-- Script 31 · 💳 Pagos: modalidad + aprobación de la administradora
-- JUCUM English Center · 05-oct-2026 · requiere el script 30 ya ejecutado.
-- Ejecutar UNA vez en Supabase → SQL Editor (es idempotente).
-- EJECUTAR ANTES de subir la entrega pagos-simple-2026-10-05.
-- ════════════════════════════════════════════════════════════════════
alter table pay_status add column if not exists mode     text default 'mensual'; -- mensual · modulo · total
alter table pay_status add column if not exists rejected text default '';        -- motivo si la admin NO aprobó (pausa salvo plazo)
alter table pay_status add column if not exists falta    numeric;                -- cuánto falta si el pago fue incompleto
