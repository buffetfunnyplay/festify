// ────────────────────────────────────────────────────────────
// Visual do convite — definido pelo público da festa:
//   menina  → rosa      · menino → azul      · para todos → vermelho
// Cores/tipografia vivem em CSS variables (src/index.css → .design-*).
// ────────────────────────────────────────────────────────────

export const DESIGNS = {
  menina: {
    id: 'menina',
    label: 'Menina',
    emoji: '🎀',
    className: 'design-menina',
    seal: '#ec4899',
    sealDark: '#be185d',
    page: '#fff1f7',
    swatch: ['#fff1f7', '#f9a8d4', '#ec4899', '#be185d'],
    confetti: ['#ec4899', '#f9a8d4', '#fde68a', '#c4b5fd', '#ffffff'],
    balloons: ['#f472b6', '#f9a8d4', '#ec4899', '#fb7185', '#fbcfe8', '#ffffff'],
  },
  menino: {
    id: 'menino',
    label: 'Menino',
    emoji: '🎈',
    className: 'design-menino',
    seal: '#2563eb',
    sealDark: '#1e40af',
    page: '#eef6ff',
    swatch: ['#eef6ff', '#93c5fd', '#2563eb', '#1e40af'],
    confetti: ['#2563eb', '#60a5fa', '#fde047', '#34d399', '#ffffff'],
    balloons: ['#2563eb', '#3b82f6', '#60a5fa', '#facc15', '#ffffff', '#1d4ed8'],
  },
  unissex: {
    id: 'unissex',
    label: 'Para todos',
    emoji: '🎉',
    className: 'design-unissex',
    seal: '#ef4444',
    sealDark: '#b91c1c',
    page: '#fff7f0',
    swatch: ['#fff7f0', '#fca5a5', '#ef4444', '#b91c1c'],
    confetti: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899'],
    balloons: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#ffffff'],
  },
}

export const DESIGN_LIST = Object.values(DESIGNS)

/** Visual de uma festa ou tema (aceita convites antigos sem "gender") */
export function designOf(item) {
  if (item?.gender && DESIGNS[item.gender]) return DESIGNS[item.gender]
  return DESIGNS.unissex
}

/** Carrega as fontes do convite (uma vez só) */
let fontsLoaded = false
export function loadInviteFonts() {
  if (fontsLoaded || typeof document === 'undefined') return
  fontsLoaded = true
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap'
  document.head.appendChild(link)
}
