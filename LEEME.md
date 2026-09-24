# Fix · Quizlet "Vocabulario Parte 2" en Modo clase (24-sep-2026) · v=20260924a

Subir los 3 archivos a la RAÍZ del repo `plataforma` (reemplazar).

- **ClassPlanner.comp.js** — el plan de clase y el Modo clase solo conocían 3 juegos (vocabulario · traducir · ordenar): el link `quizVocabulario2` del catálogo se perdía al armar el plan. Ahora se copia, se puede editar ("vocab. 2") y, en planes YA creados, se completa solo desde el catálogo vivo al abrir el Quizlet (no pisa links pegados a mano).
- **index.html** — versión `v=20260924a` (invalida el caché).
- **App.comp.js** — incluye el fix de grupo/nivel del 22-sep que aún no estaba en el repo (esta entrega REEMPLAZA a `fix-grupo-nivel-2026-09-22`).
