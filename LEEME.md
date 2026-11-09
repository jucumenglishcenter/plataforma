# Entrega foro-avisos-2026-11-09 (v=20261109h) · FORO-COMPACTO-V1 · FORO-AVISOS-V1 · FORO-ENCUESTAS-V1

## Orden
1. **Primero** ejecuta `EJECUTAR-PRIMERO-script40-avisos-foro.sql` en Supabase → SQL Editor → New query → pegar → Run. Agrega 5 columnas a `forum_posts` y las tablas `forum_ann_reads` y `forum_votes`. (Si ya lo ejecutaste antes, ejecútalo otra vez: ahora trae las encuestas y no repite nada.) No toca ninguna publicación.
2. Después sube los 6 archivos a la RAÍZ del repo `plataforma` (reemplazar), en un solo commit:
   Forum.comp.js · forum.js · supabase-sync.js · StudentDashboard.comp.js · index.html · app-build.js

Base: el repo de hoy (@ea317aa7acd2). Ya incluye el chat (`chat-mejoras-2026-11-09` está subida). Antes de editar comprobé por huella que los archivos eran iguales.

## Lo que cambia (y nada más)
1. **Respuestas del foro compactas (opción A):**
   - Cerradas por defecto: se ven las caritas de quienes respondieron y «16 respuestas · la última de Sofía, hace 4d ▾».
   - Abiertas: cada respuesta es una línea con carita chica, nombre corto, texto y hora juntos, sin caja gris.
   - «↩ Responder» y 🗑 salen al pasar el mouse (en el celular, al tocar la respuesta).
   - La sangría es de un solo nivel, con «↪ a Nombre», en lugar de escalones cada vez más adentro.
   - Se ven 3 respuestas y «Ver N respuestas más». La caja para responder queda abajo.
   - Una publicación sin respuestas tiene el botón «💬 Responder».
2. **📢 Avisos (solo el teacher):**
   - Al publicar se elige «✍️ Pregunta o comentario» o «📢 Aviso».
   - Opciones del aviso: mostrarlo en el Inicio de cada alumno; quitarlo de arriba después de una fecha (por defecto en 7 días) o dejarlo sin fecha; **publicarlo en varios grupos a la vez**, tocando cada grupo (los finalizados no salen).
   - En el foro, el aviso sale **arriba de todo**, en «📢 Avisos del teacher», con franja roja y «hasta el vie 14 nov».
   - El teacher ve «👁 Leído por N de M» (cuenta solo a los alumnos activos del grupo), «Ver quiénes faltan» y «🔔 Recordar a N». Este botón manda un aviso a la campanita de los que faltan.
   - El botón ⏹ «Terminar aviso» lo saca de arriba y del Inicio sin borrarlo.
   - Cuando pasa la fecha, el aviso queda como una publicación normal con «📢 Aviso · terminó».
   - **Inicio del alumno:** tarjeta roja «📢 Aviso de tu teacher» con «✓ Entendido» y «Ver en el foro». Desaparece al tocar Entendido o al abrir el foro (en los dos casos cuenta como leído).
   - Los alumnos pueden responder al aviso como a cualquier publicación.

3. **📊 Encuestas (teacher y alumnos):**
   - Al publicar se elige «📊 Encuesta». Se escribe la pregunta, una explicación opcional y de 2 a 6 opciones.
   - En cada encuesta se elige: si se puede marcar **una o varias** respuestas; si **todos ven los resultados después de votar** o **solo quien la creó** (el teacher siempre los ve); y la **fecha de cierre** (por defecto en 7 días) o sin fecha.
   - Solo el teacher puede: **publicarla en varios grupos a la vez** (cada grupo vota aparte) y **mostrarla en el Inicio del alumno**, que la ve hasta que vota y puede votar ahí mismo.
   - El alumno vota una vez y puede cambiar su voto hasta que cierre. Ve los porcentajes recién después de votar, si así se eligió. Un alumno silenciado puede leer, pero no votar.
   - El teacher ve «🗳 N de M votaron», «👁 Ver quién votó qué» (también quiénes faltan) y «🔔 Recordar a N», que manda un aviso a la campanita de los que faltan.
   - El botón 🔒 cierra la encuesta antes de la fecha. Los resultados quedan.
   - Las lisuras se revisan también en las opciones, igual que en cualquier publicación.

## Lo que NO cambia
«Ver grupo», reacciones, fijar (máximo 3), silenciar, filtro de lisuras, límites de texto, adjuntos y la campanita. El chat y el resto de pantallas tampoco cambian.

## Si no ejecutas el script 40
Un aviso o encuesta queda guardado como publicación normal (sin opciones) en la nube (en la consola sale el aviso «¿corriste el script 40?») y no se guardan el «Leído por» ni los votos.

## Prueba sin nube
`herramientas/Prueba - Foro avisos y compacto.html` (no toca datos reales).
