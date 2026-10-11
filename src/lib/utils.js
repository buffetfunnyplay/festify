import { isAppShell } from './native'
import { CONFIG } from './config'

// ────────────────────────────────────────────────────────────
// Utilitários gerais (datas, slug, imagem, clipboard, Pix)
// ────────────────────────────────────────────────────────────

/** UUID v4 (compatível com a coluna uuid do Postgres) */
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

/** Normaliza texto para busca: sem acento, minúsculo e sem letras repetidas ("dinossauro" ≈ "dinosauro") */
export const searchKey = (text = '') =>
  String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(.)\1+/g, '$1')
    .trim()

/** "Aniversário de 5 Anos do Pedro" → "aniversario-de-5-anos-do-pedro" */
export function slugify(text = '') {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Converte data (YYYY-MM-DD) + hora (HH:MM) em Date local */
export function partyDate(party) {
  if (!party?.date) return null
  const [y, m, d] = party.date.split('-').map(Number)
  const [hh = 0, mm = 0] = (party.time || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

export function formatDateLong(party) {
  const d = partyDate(party)
  if (!d) return ''
  const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatDateShort(party) {
  const d = partyDate(party)
  if (!d) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
}

export function formatTime(party) {
  if (!party?.time) return ''
  const [h, m] = party.time.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'agora mesmo'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  return formatDateTime(iso)
}

export const formatBRL = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Soma adultos/crianças de uma lista de RSVPs */
export function sumRsvps(rsvps = []) {
  return rsvps.reduce(
    (acc, r) => {
      acc.adults += Number(r.adults) || 0
      acc.children += Number(r.children) || 0
      acc.total = acc.adults + acc.children
      acc.responses += 1
      return acc
    },
    { adults: 0, children: 0, total: 0, responses: 0 }
  )
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// ── Imagem ──────────────────────────────────────────────────
/** Redimensiona e comprime a imagem no cliente (evita estourar o localStorage). */
export function compressImage(file, maxSide = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Arquivo não é uma imagem'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Falha ao ler a imagem'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagem inválida'))
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// ── Clipboard ───────────────────────────────────────────────
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* cai no fallback */
  }
  // Fallback para http:// / WebViews antigas
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'
  document.body.appendChild(ta)
  ta.select()
  ta.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  return ok
}

// ── Links ───────────────────────────────────────────────────
/** Links só são úteis fora do app se houver um endereço web público configurado */
export const hasPublicUrl = () => !isAppShell() || Boolean(CONFIG.publicUrl)

export const NO_PUBLIC_URL_MSG = 'Configure o endereço público do site (publicUrl em config.js) para gerar links.'

/** Monta um link público do site com os parâmetros informados */
export function publicUrl(params = {}) {
  const base = CONFIG.publicUrl && (isAppShell() || import.meta.env.PROD) ? CONFIG.publicUrl : window.location.href
  const url = new URL(base)
  url.search = ''
  url.hash = ''
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}

export const publicInviteUrl = (slug) => publicUrl({ festa: slug })
export const clientListUrl = (token) => publicUrl({ lista: token })

/** Número de WhatsApp só com dígitos e com DDI 55 quando faltar */
export function normalizeWhatsApp(raw = '') {
  const d = String(raw).replace(/\D/g, '')
  if (!d) return ''
  return d.length <= 11 ? `55${d}` : d
}

export const whatsappLink = (number, text) =>
  `https://wa.me/${normalizeWhatsApp(number)}?text=${encodeURIComponent(text)}`

export const GENDERS = {
  menina: { id: 'menina', label: 'Menina', emoji: '👧' },
  menino: { id: 'menino', label: 'Menino', emoji: '👦' },
  unissex: { id: 'unissex', label: 'Para todos', emoji: '🧒' },
}

/** Garante que o link de mapa abre corretamente (aceita endereço puro também) */
export function mapsHref(party) {
  const raw = (party?.mapsUrl || '').trim()
  if (/^https?:\/\//i.test(raw)) return raw
  const q = encodeURIComponent([party?.venueName, party?.address].filter(Boolean).join(', '))
  return q ? `https://www.google.com/maps/search/?api=1&query=${q}` : ''
}

export function wazeHref(party) {
  const q = encodeURIComponent([party?.address || party?.venueName].filter(Boolean).join(', '))
  return q ? `https://waze.com/ul?q=${q}&navigate=yes` : ''
}

// ── Pix ─────────────────────────────────────────────────────
export const PIX_TYPES = [
  { id: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
  { id: 'phone', label: 'Celular', placeholder: '(11) 91234-5678' },
  { id: 'email', label: 'E-mail', placeholder: 'voce@email.com' },
  { id: 'random', label: 'Aleatória', placeholder: 'a1b2c3d4-e5f6-...' },
]

export function detectPixType(key = '') {
  const k = key.trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k)) return 'email'
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return 'random'
  const digits = k.replace(/\D/g, '')
  if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(k)) return 'cpf'
  if (digits.length >= 10 && digits.length <= 13) return 'phone'
  return null
}

export function validatePixKey(type, key = '') {
  const k = key.trim()
  if (!k) return 'Informe a chave Pix'
  const digits = k.replace(/\D/g, '')
  switch (type) {
    case 'cpf':
      return digits.length === 11 ? null : 'CPF deve ter 11 dígitos'
    case 'phone':
      return digits.length >= 10 && digits.length <= 13 ? null : 'Celular inválido (inclua o DDD)'
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k) ? null : 'E-mail inválido'
    case 'random':
      return k.length >= 32 ? null : 'Chave aleatória parece incompleta'
    default:
      return null
  }
}

export function initials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Pessoas de uma confirmação: nomes de cada um (novas) ou só o responsável (antigas) */
export function peopleOf(r) {
  if (Array.isArray(r?.guests) && r.guests.length) return r.guests
  return [{ name: r?.name || '', kind: 'adult', legacy: true }]
}
