# Entrega comentarios-ejercicio-2026-11-06 (v=20261106a) · DOCSETS-COMENTARIO-V1

Subir los 4 archivos a la RAÍZ del repo `plataforma` (reemplazar). Sin SQL.

## Lo que cambia (y nada más)
1. **Teacher · 👁 ver la entrega de un alumno (Tareas del documento):** debajo de la respuesta de cada ejercicio hay una línea «💬 Comentario sobre esta respuesta». Se guarda con **Guardar** o Enter. Después de guardar dice «✓ Guardado». No cambia la nota ni el estado del ejercicio. Solo aparece cuando el alumno ya entregó.
2. **Alumno:** recibe una campanita «💬 Tu profe comentó tu respuesta» (ejercicio N + el comentario). Al abrir la tarea entregada ve «💬 Tu profe: …» debajo de ese ejercicio.
3. `docsets.js`: función nueva `setItemComment` (guarda `cm[i]` dentro de la entrega). `setItemResult` (✔ Está bien / ✘ Corregir / Dar por buena) ahora conserva los comentarios ya guardados.

## Archivos
- DocSets.comp.js · docsets.js · index.html (solo cambian los ?v= de estos 2 + config.js) · app-build.js (regenerado)
