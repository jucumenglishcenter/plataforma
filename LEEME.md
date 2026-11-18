# Entrega `examen-varios-dias-2026-11-17` · v=20261117c · EXAMEN-VARIOS-DIAS-V1

Base: repo `plataforma` @40e3de350959 (verificado por huella 17-nov: los 8 archivos de exámenes iguales al espejo).
Subir los **6 archivos** a la raíz del repo `plataforma`, en **un solo commit**. Sin SQL.

## Archivos
- ExamsCenter.comp.js
- exam-flow.js
- ExamsFolders.comp.js
- MisPlanetas.comp.js
- index.html
- app-build.js

## Lo que cambia (y NADA más)
1. **Exámenes › ① Programar y avisar** (ExamsCenter): nueva fila «Duración: Un día / Varios días». Con varios días: «Desde … hasta …» (máx. 14 días), atajos 3 días · 5 días · 1 semana · hasta el domingo, «Horario: Mismo horario cada día / Corrido, día y noche», tira de días y casilla «⏰ El último día, recordar solo a quien todavía no lo dio» (marcada). Con varios días la Parte 2 va seguida. «Así queda», el aviso y la línea «✓ Programado» muestran el rango.
2. **▶ Abrir ahora**: nueva opción «Hasta otro día» (fecha + hora, máx. 14 días); título «¿Hasta cuándo queda abierto?».
3. **② Día del examen**: «día X de N» y «cierra del todo el …»; botones «⏸ Cerrar solo por hoy», «⛔ Cerrar del todo» y «📅 Alargar hasta…» (o «Alargar a más días» en un examen de un día).
4. **exam-flow.js**: horario corrido (`ann.cont`), «Abrir ahora» puede durar hasta otro día (`openUntil`), el aviso programado ahora lleva la fecha final, recordatorio del último día (`remindLast`/`remindedOn`) y `horarioTxt` (texto del horario para el alumno).
5. **Alumno** (MisPlanetas + ExamsFolders): el horario del examen usa `horarioTxt` → igual que antes, salvo en el modo corrido, que dice «abierto día y noche · hasta el …».

Lo programado de un solo día funciona exactamente igual que hoy.
`config.js` no cambia de contenido (solo su `?v=` en index.html).
