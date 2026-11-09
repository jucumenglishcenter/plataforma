# Entrega inicio-apto-2026-11-09 (v=20261109a) · INICIO-APTO-V1

Subir los 3 archivos a la RAÍZ del repo `plataforma` (reemplazar), en un solo commit. Sin SQL.
Base: el repo de hoy (@28f842be8396), que se verificó archivo por archivo y es igual a la plataforma de este proyecto.

## Lo que cambia (y nada más)
1. **Alumno · Inicio · tarjeta roja «🎓 Tu examen se acerca»:** el porcentaje y el «✓ Apto / Falta X %» ahora salen del **mismo cálculo que Mi práctica** (solo el módulo de ese examen). Antes mezclaba todos los módulos abiertos y podía decir «Apto 77 %» mientras Mi práctica decía «62 %, falta 13 %».
2. En esa misma tarjeta, la etiqueta dice **«📚 Te falta terminar el módulo»** cuando eso es lo que falta, y **«✅ Habilitada por tu teacher»** si la teacher le abrió el examen. Es lo mismo que ya muestra Mi práctica.
3. El consejo «Completa tus N actividades pendientes» cuenta solo las del módulo del examen.

No cambia quién puede dar el examen, ni la nota mínima, ni ninguna otra pantalla.

## Archivos
- StudentDashboard.comp.js · index.html (solo cambian los ?v= de este archivo + config.js) · app-build.js (regenerado)
