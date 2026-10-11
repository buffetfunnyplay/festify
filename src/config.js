// Configuração em tempo de execução (public/config.js) com fallback para variáveis do Vite.
// Assim dá para trocar o servidor sem recompilar o app.
const runtime = (typeof window !== 'undefined' && window.FESTIFY_CONFIG) || {}
const clean = (v) => (typeof v === 'string' ? v.trim() : '')

export const CONFIG = {
  supabaseUrl: clean(runtime.supabaseUrl) || import.meta.env.VITE_SUPABASE_URL || '',
  supabaseKey: clean(runtime.supabaseKey) || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  publicUrl: clean(runtime.publicUrl) || import.meta.env.VITE_PUBLIC_URL || '',
}

export const isCloud = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseKey)
