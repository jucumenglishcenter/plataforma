# Examen: el alumno elige niños/adultos (26-sep-2026 · v=20260926a)

Repo destino: **plataforma** (raíz). Subir los 4 archivos: exam-flow.js, ExamsFolders.comp.js, ExamsCenter.comp.js, index.html.

## Qué pasaba
Al PROGRAMAR un examen con fecha, la plataforma guardaba una "versión" para el grupo aunque nadie la tocara
(por defecto 🧒 niños en Pre-A1, 🧑 adultos en A1/A2) y la mandaba en el enlace. El examen, al recibirla,
se salta la pantalla "¿niños o adultos?". Si el examen se abría sin programar fecha, no se mandaba nada y sí preguntaba.

## Qué cambia
- Nueva opción (y ahora la de fábrica): **👥 Que el alumno elija (grupo mixto)** → el enlace ya no fuerza versión.
- Cambiar la versión en el desplegable se guarda al instante si el examen ya estaba programado.

## Qué hacer después de subir
Los exámenes YA programados guardaron "niños": en 🎓 Exámenes → Configurar, en cada grupo, cambia el
desplegable a **👥 Que el alumno elija**. (Solo hace falta una vez.)
