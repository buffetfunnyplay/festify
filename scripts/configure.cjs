// Usado pelo GitHub Actions: preenche dist/config.js com as variáveis do repositório
// (Settings → Secrets and variables → Actions → Variables) e com o endereço do GitHub Pages.
const fs = require('fs')
const file = process.argv[2] || 'dist/config.js'

let s = fs.existsSync(file)
  ? fs.readFileSync(file, 'utf8')
  : "window.FESTIFY_CONFIG = {\n  supabaseUrl: '',\n  supabaseKey: '',\n  publicUrl: '',\n}\n"

const re = (k) => new RegExp(`${k}:\\s*'([^']*)'`)
const get = (k) => (s.match(re(k)) || [])[1] || ''
const set = (k, v) => {
  if (v) s = s.replace(re(k), `${k}: '${String(v).trim().replace(/'/g, '')}'`)
}

const env = process.env
set('supabaseUrl', env.VAR_SUPABASE_URL)
set('supabaseKey', env.VAR_SUPABASE_KEY)
if (env.VAR_PUBLIC_URL) set('publicUrl', env.VAR_PUBLIC_URL)
else if (!get('publicUrl') && env.PAGES_URL) set('publicUrl', env.PAGES_URL.toLowerCase())

fs.writeFileSync(file, s)
console.log('Supabase:', get('supabaseUrl') ? `configurado (${get('supabaseUrl')})` : 'vazio → MODO DEMONSTRAÇÃO')
console.log('Endereço público:', get('publicUrl') || '(automático)')
