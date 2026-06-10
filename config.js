/* ════════════════════════════════════════════════════════════════════
   JUCUM English Center · Configuración de Supabase
   ════════════════════════════════════════════════════════════════════

   👉 PASO ÚNICO: pega tu "Publishable key" entre las comillas de SUPABASE_ANON_KEY.

   Cómo obtenerla:
     1. En Supabase: Settings (⚙️) → API Keys
     2. Sección "Publishable key" → fila "default"
     3. Click en copiar 📋 (empieza con  sb_publishable_... )
     4. Pégalo abajo entre las comillas

   ⚠️ NO uses la "Secret key" (sb_secret_...). Esa es privada.
   La URL ya está puesta. NO cambies nada más.
   ════════════════════════════════════════════════════════════════════ */

window.JUCUM_CONFIG = {
  // Tu Project URL (ya configurada)
  SUPABASE_URL: 'https://dwwzkzuonltaavzhvilu.supabase.co',

  // 👇 PEGA TU PUBLISHABLE KEY AQUÍ (empieza con sb_publishable_...)
  SUPABASE_ANON_KEY: 'sb_publishable_6pruJuV5P2cMVWqd8Wt8gg_UAtuEj_m',

  // Dominio técnico interno para el login con usuario (no es un correo real)
  // El alumno escribe "leo.cruz" → internamente se usa "leo.cruz@jucum.local"
  USER_EMAIL_DOMAIN: 'jucum.local',

  // Bucket de Storage para audios/videos de evaluaciones
  STORAGE_BUCKET: 'attachments',
};

// Verificación: avisa si la key aún no fue pegada
if (window.JUCUM_CONFIG.SUPABASE_ANON_KEY === 'PEGA_TU_PUBLISHABLE_KEY_AQUI') {
  console.warn('⚠️ Falta pegar la Publishable key en config.js');
}
