# 📚 Materiales · Revisión (vista profesor) — 3 jul 2026

Nueva sección **📚 Materiales** en el menú del profesor para revisar todo el catálogo por nivel, marcar cada material y enviar lo que haya que corregir a soporte.

## Pasos para publicar
1. **NO hay SQL que correr.** Usa tablas que ya existen: `app_settings` (script 19) para guardar tu revisión en la nube, y `error_reports` (script 21) para "enviar a soporte".
2. Subir estos archivos a la **raíz del repo `plataforma`** (Netlify redespliega solo):
   - `MaterialsReview.comp.js` ← **archivo nuevo**
   - `TeacherDashboard.comp.js` (añade el enlace 📚 Materiales)
   - `data.js` (helpers de revisión + enviar a soporte)
   - `index.html` (carga el archivo nuevo en el fast-loader + sube `?v=` a `20260708a`)
3. Listo. El `?v=20260708a` invalida el caché del fast-loader; al recargar aparece el menú nuevo.

## Qué hace
- **Menú → 📚 Materiales:** pestañas por **nivel** (Pre-A1 / A1 / A2). Dentro: **módulo → tema → actividad**, con TODO el catálogo (aunque el grupo no lo tenga activo).
- **Resumen arriba** por nivel: total · con material · en preparación · revisados OK · por corregir. Badge rojo en la pestaña y en el módulo con lo que falta corregir.
- **Filtros:** Todos · ⚠️ Por corregir · ⬜ Sin revisar · ✅ OK · 📦 En preparación.
- **Abrir un material** → visor a pantalla completa: a la izquierda se ve el material embebido (modo profesor, sin registrar progreso ni cooldown), con **← →** para pasar al siguiente y "↗ Pestaña nueva". A la derecha:
  - **Estado:** Sin revisar / ✅ Revisado · OK / ⚠️ Por corregir.
  - **Checklist de calidad por tipo** (Story, Lectura, Listening, Resumen, Gramática, Quizlet) según la metodología (dispara nota, tiene audio, botón 🐞, traducción, latente 🌱 solo A1/A2, etc.).
  - **Observaciones / pendientes:** nota editable, se guarda en la nube.
  - **📨 Enviar a soporte:** crea un reporte editable en la bandeja **🐞 Reportes de los materiales** del panel de Desarrollo (aparece como "👨‍🏫 Profesor"). Puedes editar la nota y volver a enviar.
- Estado y notas se guardan en la nube (`app_settings` → `material_reviews`): se ven desde cualquier equipo. No afecta el progreso de los alumnos.

## Nota de desarrollo
- Estos archivos son espejo de `ui_kits/students/` (`MaterialsReview.jsx`, `TeacherDashboard.jsx`, `data.js`). Si editas en dev, recuerda volver a copiar a `publish/*.comp.js`.
- El botón 🐞 dentro de los materiales (conector) no cambió; sigue igual.
