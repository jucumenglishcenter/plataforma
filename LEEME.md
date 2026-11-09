# Entrega apto-2026-11-09 (v=20261109e) · APTO-MEDIA-V1 · APTO-BONUS-REPASOS-V1 · REPASO-NOTA-BAJA-V1 · APTO-70-PREA1-V1 · CAMPANA-VIVA-V1 · RACHA-TIEMPO-V1

Subir los 17 archivos a la RAÍZ del repo `plataforma` (reemplazar), en un solo commit. Sin SQL.
Revisado línea por línea contra el repo (09-nov 06:18 UTC): solo cambian las líneas de los puntos 2 a 5. El punto 1 (Inicio) ya está en el repo (v=20261109a) y por eso no se repite aquí.
Reemplaza a la entrega `inicio-apto-2026-11-09`, que ya no existe: lo de esa entrega viene incluido aquí.
Base: el repo de hoy (@28f842be8396). Se verificó archivo por archivo que era igual a esta plataforma.

## Lo que cambia (y nada más)
1. **Inicio · «🎓 Tu examen se acerca»:** usa el mismo apto que Mi práctica (solo el módulo de ese examen).
2. **Apto · práctica con 50–74 %:** ahora vale **la mitad** en «📚 Prácticas realizadas», también para el 60 % del módulo. Menos de 50 % no cuenta, igual que antes. No entra al «🎯 Nivel de acierto», así que nadie baja por este cambio. El detalle dice cuántas tiene así y que repetirlas las hace valer completas.
3. **Apto · bonus ⭐ Repasos de la semana:** suma **hasta +10 %** a la preparación. Se calcula con los repasos resueltos desde que se abrió el módulo: resueltos ÷ asignados × 10. **No** cuenta para el 60 % del módulo. Se ve en Mi práctica («⭐ Incluye +N % de bonus…») y en la tarjeta de preparación.
4. **⭐ Repasos de la semana:** las prácticas con nota bajo el mínimo salen **primero**, también las del módulo de clase. La lista de la semana se arma el lunes y no cambia después, así que esto se nota desde la próxima lista.
5. **Pre-A1 · Apto con 70 %** (antes 75 %). A1 y A2 siguen en 75 %. Sigue pidiendo el 60 % del módulo. Los textos que decían «75 %» ahora muestran el número del nivel del alumno: Inicio, Mi práctica, Mis planetas, Diagnóstico, Boletín, Reporte y las vistas del teacher (Grupo, Exámenes, panel). Lo mismo pasa con el aviso al publicar un examen, que dice «eres apto» o «no».
6. **Campanita del alumno (opción C):** si hay avisos sin leer, se pone **roja**, se mueve y dice «2 avisos». Adentro, cada aviso nuevo es una tarjeta de color con su botón («▶ Practicar ahora», «📝 Abrir», etc.). La campanita del teacher y la del admin **no cambian**.
7. **Inicio · tarjeta de racha (opción A):** arriba de todo en Inicio aparece una tarjeta con un anillo de los **minutos que faltan** para que hoy cuente en la racha, «⏳ El día termina en X h Y min» y el botón «▶ Practicar N min». Usa los mismos minutos y la misma meta del grupo que ya usa la racha. No sale los domingos, ni si el día ya contaba al entrar. Al llegar a la meta se pone verde «¡Listo! Hoy ya cuenta» y se oculta a los 8 s. En la última hora del día, la tarjeta late.

## Lo que NO cambia
XP, medallas, «módulo terminado», **nota mínima de las prácticas** (Pre-A1 sigue en 75), el aviso «Por mejorar», quién puede dar el examen fuera del apto, ni el resto de pantallas.

## Archivos
StudentDashboard.comp.js · Notifications.comp.js · data.js · mixed.js · ExamsFolders.comp.js · Readiness.comp.js · MisPlanetas.comp.js · StudentDiagnosis.comp.js · exams.js · Exams.comp.js · GroupWorkspace.comp.js · StudentReport.comp.js · TeacherDashboard.comp.js · ExamsCenter.comp.js · Boletin.comp.js · index.html (los ?v= + los estilos de la campanita viva y de la tarjeta de racha) · app-build.js (generado de nuevo)
