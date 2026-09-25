# Entrega fix-modulo-racha-2026-09-25 · repo `plataforma` · v=20260925a

Subir los 5 archivos a la RAÍZ del repo `plataforma` (reemplazar): `index.html`, `App.comp.js`, `StudentDashboard.comp.js`, `data.js`, `jucum-connect.js`.

## Qué arregla
1. **Caso Lesli (resultado en M1 estando en M3).** Confirmado en la nube: a las 9:09 p. m. abrió el *Listening del M1* desde 🔁 Repaso / “por mejorar” (mismo nombre que el del M3, sin decir el módulo). Ahora cada tarjeta de repaso, por mejorar y refuerzo lleva la etiqueta **M1 · repaso** (ámbar) o **M3**, y el chip ⏱ del material también muestra **M1 · repaso**. Así lo ven el alumno y la profesora cuando mira la pantalla.
2. **Racha en peligro falsa.** La alarma roja con sonido y el aviso de meta se calculaban antes de que llegaran de la nube los minutos de hoy → quien ya practicó en casa recibía “tu racha está en peligro” en la clase de la noche. Ahora esperan a la nube. También usaban el día UTC (después de las 7 p. m. se repetía el aviso): ahora es día Perú.
3. **Racha cortada por Quizlet.** Un día con solo Quizlet no quedaba en `daily_sessions` y se perdía al repetirlo otro día. Ahora deja constancia del día en la nube (sin pisar filas).
4. **Blindaje:** si el alumno de la sesión no está en la lista, ya no se muestra otro alumno (antes caía en el primero de la lista).

5. **Caso Fabrizio (“por mejorar” que no abre).** Salían notas de módulos que ya no existen (a1-m1, a1-mmqr1zw5o, reimportados con otro id) con el id crudo (“reading”, “t2-id”) y al tocar Repetir no pasaba nada. Ahora esas notas viejas no se listan.
6. **Caso Yoel → “perfil de Dylan”.** Al pasarlo de Pre-A1 a A1 se le creó una cuenta nueva (22-sep); un equipo que seguía con la sesión de la cuenta vieja mostraba al primer alumno de la lista. Ahora, si la cuenta de la sesión ya no existe, se cierra sola y pide volver a entrar con un aviso.
