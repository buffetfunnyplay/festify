// Roteador mínimo baseado em query string (funciona em hospedagem estática,
// GitHub Pages, PWA e dentro do Capacitor sem configurar rewrites).
//
// SITE PÚBLICO
//   (vazio)                  → página inicial (no APK / Windows: painel do buffet)
//   ?b=buffet                → biblioteca de temas daquele buffet
//   ?b=buffet&tema=slug      → página do tema (fotos, miniatura, pedir convite)
//   ?b=buffet&tema=slug&demo=1 → demonstração animada do convite com o tema
//   ?festa=slug              → convite do convidado
//   ?lista=token             → lista privada de confirmados (cliente)
//
// PAINEL DO BUFFET  (?admin=1 + view)
//   view=(vazio)             → convites
//   view=library             → biblioteca (gerenciar temas)
//   view=theme&id=|new       → editar/criar tema
//   view=settings            → ajustes do buffet
//   view=access              → liberações (somente dono da plataforma)
//   view=new[&theme=id]      → gerar convite (opcionalmente a partir de um tema)
//   view=edit&id=            → editar convite
//   view=guests&id=          → lista de presença
import { useEffect, useState } from 'react'

const parse = () => Object.fromEntries(new URLSearchParams(window.location.search))

// Profundidade da navegação interna — usada pelo botão Voltar do Android
let depth = 0
export const canGoBack = () => depth > 0

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onNav = () => setRoute(parse())
    const onPop = () => {
      depth = Math.max(0, depth - 1)
      onNav()
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('festify:navigate', onNav)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('festify:navigate', onNav)
    }
  }, [])
  return route
}

export function navigate(params = {}, { replace = false } = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`
  if (replace) window.history.replaceState({}, '', url)
  else {
    window.history.pushState({}, '', url)
    depth++
  }
  window.dispatchEvent(new Event('festify:navigate'))
  window.scrollTo({ top: 0 })
}

/** Navega dentro do painel admin */
export const goAdmin = (params = {}, opts) => navigate({ admin: '1', ...params }, opts)
