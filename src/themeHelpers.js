// Utilitários da biblioteca de temas (público + admin)
import { GENDERS, publicUrl, searchKey, whatsappLink } from '../lib/utils'
import { navigate } from '../hooks/useRoute'

export const themeCover = (t) => t?.photos?.[t.coverIndex || 0] || t?.photos?.[0] || ''

/** Miniatura leve (gerada no envio da foto); temas antigos usam a foto grande */
export const themeThumb = (t, i = t?.coverIndex || 0) => t?.thumbs?.[i] || t?.photos?.[i] || t?.thumbs?.[0] || t?.photos?.[0] || ''

export const genderOf = (t) => GENDERS[t?.gender] || GENDERS.unissex

/** Filtro por gênero: temas "para todos" aparecem tanto em menina quanto em menino */
export const matchesGender = (t, filter) => !filter || filter === 'todos' || t.gender === filter || !t.gender || t.gender === 'unissex'

export function matchesSearch(t, query) {
  const q = searchKey(query)
  if (!q) return true
  const haystack = searchKey([t.name, t.description, ...(t.tags || [])].join(' '))
  return q.split(/\s+/).every((word) => haystack.includes(word))
}

/** Endereços públicos de um buffet */
export const libraryUrl = (handle) => publicUrl({ b: handle })
export const themePageUrl = (handle, slug) => publicUrl({ b: handle, tema: slug })

/** Volta para a biblioteca do buffet */
export const goLibrary = (handle, opts) => navigate(handle ? { b: handle } : {}, opts)

const isoInDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Festa fictícia para miniatura e demonstração do convite do tema */
export function sampleParty(theme, settings = {}) {
  const title =
    theme.gender === 'menina' ? 'Aniversário de 5 Anos da Alice' : theme.gender === 'menino' ? 'Aniversário de 5 Anos do Theo' : 'Aniversário de 5 Anos'
  return {
    id: `demo-${theme.id}`,
    slug: `demo-${theme.slug}`,
    title,
    message: `Prepare-se para uma festa incrível com o tema ${theme.name}! Esperamos você.`,
    date: isoInDays(30),
    time: '15:00',
    coverImage: themeCover(theme),
    gender: theme.gender || 'unissex',
    venueName: settings.buffetName || 'Nosso buffet',
    address: settings.address || 'Endereço do buffet',
    mapsUrl: settings.mapsUrl || '',
    pixEnabled: true,
    pixType: 'email',
    pixKey: 'exemplo@email.com',
    pixHolder: 'Família do aniversariante',
    buffet: { name: settings.buffetName, handle: settings.handle },
  }
}

/** Link do WhatsApp do buffet com a mensagem "Amei esse tema..." */
export function requestInviteLink(theme, settings) {
  const text = `Amei esse tema: *${theme.name}*, vou querer ele!! 🎉\nConsegue me enviar o link do convite online?\n\n${themePageUrl(settings.handle, theme.slug)}`
  return whatsappLink(settings.whatsapp, text)
}
