// ────────────────────────────────────────────────────────────
// Dados de demonstração (somente no modo local, sem Supabase).
// Cria ajustes do buffet, uma biblioteca de temas com "fotos"
// ilustrativas geradas no próprio aparelho e uma festa de exemplo.
// ────────────────────────────────────────────────────────────
import { uid } from '../lib/utils'

const FLAG = 'festify:v3:seeded-party'
const FLAG_THEMES = 'festify:v3:seeded'

const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const DEMO_THEMES = [
  { name: 'Dinossauros', emoji: '🦖', extra: ['🌋', '🦕', '🌿', '🥚'], gender: 'menino', colors: ['#2f9e44', '#ffd43b', '#f76707'], tags: ['dinossauro', 'jurássico', 'aventura', 'pré-histórico'], description: 'Uma aventura jurássica com vulcões, folhagens e muitos dinos para explorar.' },
  { name: 'Fundo do Mar', emoji: '🧜‍♀️', extra: ['🐚', '🐠', '🫧', '🐙'], gender: 'menina', colors: ['#12b886', '#4dabf7', '#f783ac'], tags: ['sereia', 'fundo do mar', 'oceano', 'praia'], description: 'Sereias, conchas e bolhas em tons de azul, verde-água e rosa.' },
  { name: 'Astronauta', emoji: '🚀', extra: ['🪐', '⭐', '🌙', '👩‍🚀'], gender: 'menino', colors: ['#1c1f4a', '#5f3dc4', '#22b8cf'], tags: ['espaço', 'foguete', 'planetas', 'galáxia'], description: 'Uma viagem pelas galáxias com foguetes, planetas e estrelas brilhantes.' },
  { name: 'Unicórnio', emoji: '🦄', extra: ['🌈', '☁️', '✨', '💖'], gender: 'menina', colors: ['#f3d9fa', '#a5d8ff', '#ffdeeb'], tags: ['unicórnio', 'arco-íris', 'mágico', 'fantasia'], description: 'Tons pastel, arco-íris e muita magia para uma festa encantada.' },
  { name: 'Safári', emoji: '🦁', extra: ['🦒', '🐘', '🌴', '🦓'], gender: 'unissex', colors: ['#e67700', '#82c91e', '#f4d35e'], tags: ['safari', 'selva', 'animais', 'leão', 'zoológico'], description: 'Leões, girafas e elefantes numa expedição pela savana.' },
  { name: 'Jardim Encantado', emoji: '🌸', extra: ['🦋', '🌷', '🍄', '🧚'], gender: 'menina', colors: ['#ffc9de', '#d8f5a2', '#fff3bf'], tags: ['jardim', 'flores', 'borboletas', 'fadas'], description: 'Flores, borboletas e fadas em um jardim delicado e romântico.' },
  { name: 'Futebol', emoji: '⚽', extra: ['🏆', '🥅', '👟', '🎽'], gender: 'menino', colors: ['#2b8a3e', '#ffffff', '#1971c2'], tags: ['futebol', 'bola', 'esporte', 'copa', 'campeão'], description: 'Clima de final de campeonato com troféu, gramado e torcida.' },
  { name: 'Circo', emoji: '🎪', extra: ['🤹', '🎈', '🍿', '🎩'], gender: 'unissex', colors: ['#e03131', '#ffd43b', '#1c7ed6'], tags: ['circo', 'palhaço', 'picadeiro', 'mágico'], description: 'Respeitável público! Picadeiro, pipoca e muita alegria.' },
  { name: 'Neon Party', emoji: '🪩', extra: ['🎧', '⚡', '🕺', '💜'], gender: 'unissex', colors: ['#0b0b12', '#ff2bd6', '#00f0ff'], tags: ['balada', 'neon', 'teen', '15 anos', 'glow'], description: 'Luzes neon e pista de dança para pré-adolescentes e debutantes.' },
  { name: 'Princesa', emoji: '👑', extra: ['🏰', '💎', '🌹', '✨'], gender: 'menina', colors: ['#fcc2d7', '#e599f7', '#ffe066'], tags: ['princesa', 'castelo', 'realeza', 'coroa'], description: 'Um castelo dos sonhos com coroas, joias e muito brilho.' },
]

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Gera uma "foto" ilustrativa do tema (JPEG data URL) no canvas */
function makePhoto(t, variant) {
  const W = 720
  const H = 540
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const [c1, c2, c3] = t.colors

  const grad = g.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, c1)
  grad.addColorStop(0.55, c2)
  grad.addColorStop(1, c3)
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)

  // bolhas suaves
  let seed = variant * 97 + t.name.length * 13
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < 14; i++) {
    g.globalAlpha = 0.12 + rnd() * 0.15
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(rnd() * W, rnd() * H, 20 + rnd() * 90, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const emojiFont = (px) => `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`

  if (variant === 0) {
    // composição principal: mesa do bolo
    g.fillStyle = 'rgba(255,255,255,.85)'
    g.fillRect(140, 400, 440, 22)
    g.fillStyle = 'rgba(0,0,0,.12)'
    g.fillRect(160, 422, 400, 90)
    g.fillStyle = '#1f1f2e' // opaco: emojis coloridos herdam a transparência do fillStyle
    g.font = emojiFont(190)
    g.fillText(t.emoji, W / 2, 255)
    g.font = emojiFont(70)
    g.fillText('🎂', W / 2, 365)
    g.fillText(t.extra[0], 205, 355)
    g.fillText(t.extra[1], 515, 355)
    g.font = emojiFont(54)
    g.fillText('🎈', 80, 110)
    g.fillText('🎈', 640, 90)
  } else if (variant === 1) {
    // padrão repetido
    g.fillStyle = '#1f1f2e'
    g.font = emojiFont(64)
    const all = [t.emoji, ...t.extra]
    let k = 0
    for (let y = 70; y < H; y += 110) {
      for (let x = (y / 110) % 2 ? 60 : 120; x < W; x += 130) g.fillText(all[k++ % all.length], x, y)
    }
  } else {
    // detalhe / lembrancinhas
    g.fillStyle = 'rgba(255,255,255,.9)'
    g.beginPath()
    g.arc(W / 2, H / 2, 170, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#1f1f2e'
    g.font = emojiFont(150)
    g.fillText(t.extra[2] || t.emoji, W / 2, H / 2 + 5)
    g.font = emojiFont(60)
    g.fillText(t.extra[3] || '🎁', 120, 120)
    g.fillText('🎁', 600, 430)
    g.fillText('🍬', 110, 430)
  }
  const full = c.toDataURL('image/jpeg', 0.72)
  // miniatura (lista da biblioteca carrega rápido mesmo com dezenas de temas)
  const t2 = document.createElement('canvas')
  t2.width = 360
  t2.height = 270
  t2.getContext('2d').drawImage(c, 0, 0, 360, 270)
  return { full, thumb: t2.toDataURL('image/jpeg', 0.7) }
}

export async function seedDemoData(repo) {
  try {
    if (localStorage.getItem(FLAG_THEMES)) return
    localStorage.setItem(FLAG_THEMES, '1')

    // Ajustes do buffet
    const settings = await repo.getSettings()
    await repo.saveSettings({
      tagline: 'Escolha o tema da sua festa e receba o convite online',
      whatsapp: '',
      address: 'Rua das Flores, 123 — Jardim Primavera, São Paulo - SP',
      mapsUrl: '',
      bannerTitle: 'Escolha o tema da sua festa 🎈',
      bannerText: 'Veja as fotos, escolha o seu favorito e peça o convite online.',
      bannerImage: '',
      ...settings,
      buffetName: settings.buffetName || 'Buffet Magia & Farra',
    })

    // Biblioteca de temas
    let themes = await repo.listThemes()
    if (!themes.length) {
      for (const t of DEMO_THEMES) {
        const shots = [0, 1, 2].map((v) => makePhoto(t, v))
        await repo.saveTheme({
          id: uid(),
          slug: slug(t.name),
          name: t.name,
          emoji: t.emoji,
          gender: t.gender,
          tags: t.tags,
          description: t.description,
          photos: shots.map((x) => x.full),
          thumbs: shots.map((x) => x.thumb),
          coverIndex: 0,
          active: true,
        })
      }
      themes = await repo.listThemes()
    }

    // Festa de exemplo (somente no primeiro acesso)
    if (!localStorage.getItem(FLAG) && !(await repo.listParties()).length) {
      localStorage.setItem(FLAG, '1')
      const dino = themes.find((t) => t.slug === 'dinossauros')
      const date = new Date()
      date.setDate(date.getDate() + 21)
      date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7))
      const party = await repo.saveParty({
        slug: 'pedro-5-anos',
        title: 'Aniversário de 5 Anos do Pedro',
        message: 'Vai ter bolo, brigadeiro, pula-pula e muita diversão. Venha comemorar com a gente!',
        date: isoDate(date),
        time: '15:00',
        coverImage: dino?.photos?.[0] || '',
        themeId: dino?.id || null,
        themeName: dino?.name || '',
        gender: 'menino',
        venueName: 'Buffet Magia & Farra',
        address: 'Rua das Flores, 123 — Jardim Primavera, São Paulo - SP',
        mapsUrl: '',
        pixEnabled: true,
        pixType: 'email',
        pixKey: 'familia.pedro@email.com',
        pixHolder: 'Mariana Souza',
      })
      const families = [
        { adults: ['Ana Beatriz Lima', 'Rafael Lima'], children: ['Sofia Lima'], message: 'Pedro, estamos muito felizes por você! Até lá! 💙' },
        { adults: ['Carlos Henrique'], children: ['Lucas Henrique', 'Davi Henrique'], message: '' },
        { adults: ['Juliana Oliveira', 'Marcos Oliveira'], children: ['Helena Oliveira', 'Bento Oliveira'], message: 'Contem com a gente! Os meninos não param de falar da festa.' },
      ]
      for (const f of families) {
        await repo.addRsvp(party.id, {
          name: f.adults[0],
          adults: f.adults.length,
          children: f.children.length,
          guests: [...f.adults.map((name) => ({ name, kind: 'adult' })), ...f.children.map((name) => ({ name, kind: 'child' }))],
          message: f.message,
        })
      }
    }
  } catch (err) {
    console.warn('[Festify] seed de demonstração falhou:', err)
  }
}
