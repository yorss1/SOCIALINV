/* Configuración pública del backend. Rellenar tras crear el proyecto en Supabase.
   La clave "anon" es PÚBLICA por diseño: la seguridad la dan las políticas RLS.
   NUNCA pongas aquí la clave "service_role". Si se deja vacío, la app funciona en modo local (como hasta ahora). */
window.SOCIALINV_CONFIG = {
  supabaseUrl: 'https://ugtnxgqxwjaylcsqifvt.supabase.co',      // p. ej. https://xxxxxxxx.supabase.co
  supabaseAnonKey: 'sb_publishable_1e_RxXFRykKWXhTnLJRlzA_KwfisWaO'   // Settings → API → anon public
};
