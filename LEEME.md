# Entrega chat-mejoras-2026-11-09 (v=20261109g) · CHAT-MEJORAS-V1

## Orden
1. **Primero** ejecutar `EJECUTAR-PRIMERO-script39-reacciones-chat.sql` en Supabase → SQL Editor → New query → pegar → Run. Este script agrega la columna `reactions` a la tabla `messages` y no toca ningún mensaje.
2. Después, subir los 6 archivos a la RAÍZ del repo `plataforma` (reemplazar), en un solo commit:
   messages.js · messages-ui.comp.js · StudentDashboard.comp.js · TeacherDashboard.comp.js · index.html · app-build.js

Base: el repo de hoy (@596b9f157b10). Antes de editar comprobé por huella que los 100 archivos eran iguales al espejo: la entrega `apto-2026-11-09` ya está subida.

## Lo que cambia (y nada más)
1. **Día y hora en el chat:** los días se separan con «Hoy», «Ayer» o «Lun 3 nov», y cada mensaje lleva su hora («9:35 p. m.»). Al pasar el mouse se ve la fecha completa. Siempre en **hora Perú**. En la lista de chats sale la hora si el mensaje es de hoy, si no «Ayer», el día de la semana o la fecha.
2. **Enter = nueva línea:** la caja de texto ahora acepta varias líneas y crece sola hasta unas 5. Se envía con ➤ o con **Ctrl + Enter** (⌘ + Enter en Mac). El mensaje se ve con sus saltos de línea. Vale para el teacher y para los alumnos.
3. **Reacciones 👍 ❤️ 😂 😮 👏 ✅:** en la computadora se abren con ☺ al pasar el mouse sobre un mensaje; en el celular, manteniendo el dedo encima. Cada persona puede dejar una reacción por mensaje, y tocarla otra vez la quita. Solo se reacciona a mensajes de otros. Reaccionar no manda campanita.
4. **Contador de «💬 Chats» (teacher):** se actualiza solo cada 30 s y al volver a la pestaña. Si llega algo nuevo, late.
5. **Burbuja flotante (teacher):** en todas las pantallas menos Chats aparece «N alumnos esperan respuesta», con sus iniciales. Al tocarla se abre el chat que más espera. Con ✕ se oculta hasta que llegue el próximo mensaje.
6. **Filtro «⏳ Por responder» (teacher):** cada chat muestra cuánto lleva esperando. «Por responder» = el último mensaje es del alumno, es de los últimos 14 días y no le respondiste ni le reaccionaste (un 👍 cuenta como atendido). No cuenta los grupos de trabajo.
7. **Alumno · tarjeta «¡Tu teacher te respondió!»:** sale arriba de todo en su Inicio (estilo A), con tu carita saludando, tu mensaje, a qué pregunta respondes, tu reacción si la hay y el botón «💬 Leer y responder». Desaparece cuando el alumno abre el chat. Con ✕ se oculta hasta tu próxima respuesta.

## Lo que NO cambia
El resto del chat (adjuntos, nota de voz, grupos de trabajo, nuevo chat), la campanita, el foro, el resto del Inicio del alumno y las demás pantallas del teacher. No se agregó el número en la pestaña del navegador (4c), porque no estaba marcado.

## Prueba sin nube
`herramientas/Prueba - Chat mejoras.html` (no toca datos reales).
