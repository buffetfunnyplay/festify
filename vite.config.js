import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { BRAND } from './brand.config.js'

// Injeta a cor da marca no index.html (%BRAND%)
const brandHtml = () => ({ name: 'festify-brand', transformIndexHtml: (html) => html.replaceAll('%BRAND%', BRAND) })

// `npm run build`         → build normal (hospedagem web / Capacitor)
// `npm run build:single`  → gera UM único festify.html que abre com duplo clique (file://)
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: './',
    plugins: [react(), brandHtml(), ...(single ? [viteSingleFile()] : [])],
    build: single
      ? { outDir: 'dist-single', emptyOutDir: true }
      : {
          rollupOptions: {
            output: {
              // Separa libs pesadas: o convidado carrega só o necessário
              manualChunks(id) {
                if (id.includes('jspdf')) return 'pdf'
                if (id.includes('gsap')) return 'gsap'
              },
            },
          },
        },
  }
})
