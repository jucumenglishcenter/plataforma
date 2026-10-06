-- Script 32 · Nombres parejos de grupos (06-oct-2026) · formato: Nivel - Días · Horario
-- Ejecutar en Supabase → SQL Editor. Solo cambia name/schedule; nada se pierde (todo va por id).
-- NO toca: Homeschool A/B/C, GRUPO DE PRUEBA, GRUPO DE PAUSA.
begin;
update groups set name = 'Pre-A1 - Lunes y Viernes',            schedule = '6:30 pm - 8:10 pm'  where id = 'df4b0fa8-048e-4840-999d-f6e73ec2657b'; -- antes: Turno Noche
update groups set name = 'Pre-A1 - Martes y Viernes',           schedule = '4:30 pm - 6:10 pm'  where id = '250c59a9-c47f-4729-9b7a-79543128f0be'; -- antes: TARDE - MARTES Y VIERNES
update groups set name = 'A1 - Lunes y Jueves',                 schedule = '8:20 pm - 10:00 pm' where id = 'd4a8d0a5-09c6-48c3-bc74-0ad6abc4d2b1'; -- antes: A1 - Lunes y Jueves (noche)
update groups set name = 'A1 - Lunes y Jueves',                 schedule = '4:30 pm - 6:10 pm'  where id = 'e47b1c63-bdb3-44d8-95ba-271ea74939ad'; -- antes: TARDES - Lunes y Jueves
update groups set name = 'A2 - Martes y Viernes',               schedule = '8:20 pm - 10:00 pm' where id = '3132a2a2-d851-479e-8d75-5b50cc16cc9f';
update groups set name = 'Pre-A1 - Lunes, Miércoles y Viernes', schedule = '9:15 am - 10:55 am' where id = 'b0d66b08-7b9d-4ac3-a80d-6116db24bab2'; -- antes: Turno Mañana (finalizado)
update groups set name = 'Pre-A1 - Martes y Sábado',            schedule = '4:00 pm - 5:40 pm'  where id = '8c12f8b0-17af-432d-8bde-28cdeb3d7fc6'; -- antes: Turno Tarde (finalizado)
commit;
-- Comprobar:
select name, schedule, level from groups order by level, name;
