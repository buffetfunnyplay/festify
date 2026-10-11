// ────────────────────────────────────────────────────────────
// Adapter local (MODO DEMONSTRAÇÃO) — dados no localStorage.
//
// Implementa exatamente o mesmo contrato do supabaseAdapter.js,
// então a interface não sabe (nem precisa saber) onde os dados estão.
// Um único buffet de exemplo ("demo"), já liberado, e você como
// dono da plataforma (para ver a tela de Liberações).
//
// ⚠️ No modo demonstração cada aparelho tem os SEUS dados: uma
// confirmação feita no celular do convidado NÃO chega ao seu app.
// Para isso, conecte o Supabase (tutorial).
// ────────────────────────────────────────────────────────────
import { uid } from '../lib/utils'
import { buffetHandle } from '../lib/auth'

const NS = 'festify:v3'
const KEYS = {
  buffet: `${NS}:buffet`,
  parties: `${NS}:parties`,
  themes: `${NS}:themes`,
  session: `${NS}:session`,
  requests: `${NS}:requests`,
  rsvps: (partyId) => `${NS}:rsvps:${partyId}`,
}

const bus = new EventTarget()

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      throw new Error('Armazenamento do modo demonstração cheio. Use fotos menores, exclua itens antigos ou conecte o Supabase.')
    }
    throw err
  }
}

const emit = (type, partyId) => bus.dispatchEvent(new CustomEvent('change', { detail: { type, partyId } }))
const now = () => new Date().toISOString()
const byDate = (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)

function upsert(key, input) {
  const list = read(key, [])
  const idx = list.findIndex((x) => x.id === input.id)
  let item
  if (idx >= 0) {
    item = { ...list[idx], ...input, updatedAt: now() }
    list[idx] = item
  } else {
    item = { ...input, id: input.id || uid(), createdAt: now(), updatedAt: now() }
    list.push(item)
  }
  write(key, list)
  return item
}

/** Leva os dados de demonstração das versões anteriores para a v3 */
function migrate() {
  try {
    if (localStorage.getItem(KEYS.buffet)) return
    const old = (k) => read(`festify:v1:${k}`, null)
    const settings = old('settings') || {}
    write(KEYS.buffet, {
      id: uid(),
      handle: 'demo',
      name: settings.buffetName || 'Buffet Magia & Farra',
      status: 'active',
      data: { ...settings, buffetName: undefined },
    })
    const themes = old('themes')
    const parties = old('parties')
    if (themes) write(KEYS.themes, themes)
    if (parties) {
      write(KEYS.parties, parties)
      for (const p of parties) {
        const r = read(`festify:v1:rsvps:${p.id}`, null)
        if (r) write(KEYS.rsvps(p.id), r)
      }
    }
    if (localStorage.getItem('festify:v1:demo-admin')) localStorage.setItem(KEYS.session, '1')
    Object.keys(localStorage)
      .filter((k) => k.startsWith('festify:v1:'))
      .forEach((k) => localStorage.removeItem(k))
  } catch (err) {
    console.warn('[Festify] migração do modo demo falhou', err)
  }
}

const getBuffet = () => read(KEYS.buffet, null)
const withBuffet = (t) => t && { ...t, buffetId: getBuffet()?.id }
const publicBuffet = (b) => b && { handle: b.handle, name: b.name, logo: b.data?.logo || '', whatsapp: b.data?.whatsapp || '' }

export function createLocalAdapter() {
  migrate()

  const api = {
    name: 'local',
    supportsGoogle: false,
    supportsPassword: false,

    // ── Autenticação (demo: sem senha) ──
    async getSession() {
      return localStorage.getItem(KEYS.session) ? { user: { id: 'demo', email: 'demo@festify.app' } } : null
    },
    async signInDemo() {
      localStorage.setItem(KEYS.session, '1')
      bus.dispatchEvent(new CustomEvent('auth'))
    },
    async signOut() {
      localStorage.removeItem(KEYS.session)
      bus.dispatchEvent(new CustomEvent('auth'))
    },
    onAuthChange(cb) {
      const handler = async () => cb(await api.getSession())
      bus.addEventListener('auth', handler)
      return () => bus.removeEventListener('auth', handler)
    },
    onAuthError() {
      return () => {}
    },

    async getAccount() {
      if (!(await api.getSession())) return null
      const b = getBuffet()
      return {
        super: true,
        member: { user_id: 'demo', status: 'active', method: 'demo', email: 'demo@festify.app' },
        buffet: b && { ...b },
      }
    },
    async requestAccess() {
      return api.getAccount()
    },
    async cancelRequest() {},

    // ── Liberações (exemplos fictícios para conhecer a tela) ──
    async adminOverview() {
      const b = getBuffet()
      const reqs = read(KEYS.requests, null) || [
        { id: uid(), handle: 'buffet-alegria-kids', name: 'Buffet Alegria Kids', status: 'pending', method: 'google', email: 'contato.alegriakids@gmail.com', created_at: now() },
        { id: uid(), handle: 'espaco-encantado', name: 'Espaço Encantado', status: 'pending', method: 'senha', email: null, created_at: now() },
      ]
      if (!read(KEYS.requests, null)) write(KEYS.requests, reqs)
      const themes = read(KEYS.themes, []).length
      const parties = read(KEYS.parties, []).length
      return [
        ...reqs.map((r) => ({
          buffet: { id: r.id, handle: r.handle, name: r.name, status: r.status, created_at: r.created_at },
          whatsapp: '',
          themes: 0,
          parties: 0,
          members: [{ user_id: `u-${r.id}`, buffet_id: r.id, status: r.status, method: r.method, email: r.email, created_at: r.created_at }],
        })),
        {
          buffet: { id: b.id, handle: b.handle, name: b.name, status: 'active', created_at: b.createdAt || now() },
          whatsapp: b.data?.whatsapp || '',
          themes,
          parties,
          members: [{ user_id: 'demo', buffet_id: b.id, status: 'active', method: 'google', email: 'demo@festify.app (você)', created_at: now() }],
        },
      ]
    },
    async setMemberStatus(userId, status) {
      if (userId === 'demo') throw new Error('Você não pode alterar o próprio acesso.')
      write(
        KEYS.requests,
        read(KEYS.requests, []).map((r) => (`u-${r.id}` === userId ? { ...r, status } : r))
      )
      emit('account')
    },
    async setBuffetStatus(id, status) {
      if (id === getBuffet()?.id) throw new Error('Você não pode bloquear o próprio buffet.')
      write(
        KEYS.requests,
        read(KEYS.requests, []).map((r) => (r.id === id ? { ...r, status } : r))
      )
      emit('account')
    },
    async deleteMember(userId) {
      if (userId === 'demo') throw new Error('Você não pode remover o próprio acesso.')
      write(
        KEYS.requests,
        read(KEYS.requests, []).filter((r) => `u-${r.id}` !== userId)
      )
      emit('account')
    },

    // ── Imagens: no modo demo ficam como data URL ──
    async uploadImage(dataUrl) {
      return dataUrl
    },

    // ── Ajustes do buffet ──
    async getSettings() {
      const b = getBuffet()
      return { ...(b?.data || {}), buffetName: b?.name || '', handle: b?.handle || 'demo', buffetId: b?.id }
    },
    async saveSettings(settings) {
      // eslint-disable-next-line no-unused-vars
      const { buffetName, handle, buffetId, ...data } = settings
      const b = getBuffet()
      write(KEYS.buffet, { ...b, name: String(buffetName || b.name).trim(), data, updatedAt: now() })
      emit('settings')
      return api.getSettings()
    },

    // ── Público ──
    async getPublicBuffet(handle) {
      const b = getBuffet()
      if (!b || !handle || (handle !== b.handle && handle !== buffetHandle(b.name))) return null
      return { id: b.id, handle: b.handle, name: b.name, status: b.status, data: b.data || {} }
    },

    // ── Biblioteca de temas ──
    async listThemes() {
      return read(KEYS.themes, [])
        .map(withBuffet)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
    },
    async getTheme(id) {
      return withBuffet(read(KEYS.themes, []).find((t) => t.id === id)) || null
    },
    async getThemeBySlug(slug) {
      return withBuffet(read(KEYS.themes, []).find((t) => t.slug === slug)) || null
    },
    async isThemeSlugAvailable(slug, ignoreId) {
      return !read(KEYS.themes, []).some((t) => t.slug === slug && t.id !== ignoreId)
    },
    async saveTheme(input) {
      const theme = upsert(KEYS.themes, input)
      emit('theme')
      return theme
    },
    async deleteTheme(id) {
      write(
        KEYS.themes,
        read(KEYS.themes, []).filter((t) => t.id !== id)
      )
      emit('theme')
    },

    // ── Festas / convites ──
    async listParties() {
      return read(KEYS.parties, []).sort(byDate)
    },
    async getParty(id) {
      return read(KEYS.parties, []).find((p) => p.id === id) || null
    },
    async getPartyBySlug(slug) {
      const p = read(KEYS.parties, []).find((x) => x.slug === slug)
      if (!p) return null
      // eslint-disable-next-line no-unused-vars
      const { clientToken, ...pub } = p // o token da lista nunca vai para a página pública
      return { ...pub, buffet: publicBuffet(getBuffet()) }
    },
    async isSlugAvailable(slug, ignoreId) {
      return !read(KEYS.parties, []).some((p) => p.slug === slug && p.id !== ignoreId)
    },
    async saveParty(input) {
      // eslint-disable-next-line no-unused-vars
      const { buffet, ...data } = input
      const party = upsert(KEYS.parties, { ...data, clientToken: data.clientToken || uid() })
      emit('party')
      return party
    },
    async deleteParty(id) {
      write(
        KEYS.parties,
        read(KEYS.parties, []).filter((p) => p.id !== id)
      )
      localStorage.removeItem(KEYS.rsvps(id))
      emit('party')
    },

    // ── Confirmações (RSVP) ──
    async listRsvps(partyId) {
      return read(KEYS.rsvps(partyId), [])
        .map((r) => ({ guests: [], message: '', ...r }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async listRsvpTotals() {
      const out = {}
      for (const p of read(KEYS.parties, [])) {
        const list = read(KEYS.rsvps(p.id), [])
        out[p.id] = list.reduce(
          (t, r) => ({
            adults: t.adults + (r.adults || 0),
            children: t.children + (r.children || 0),
            total: t.total + (r.adults || 0) + (r.children || 0),
            responses: t.responses + 1,
          }),
          { adults: 0, children: 0, total: 0, responses: 0 }
        )
      }
      return out
    },
    async addRsvp(partyId, data) {
      if (!read(KEYS.parties, []).some((p) => p.id === partyId)) throw new Error('Convite não encontrado')
      const adults = Math.max(0, Number(data.adults) || 0)
      const children = Math.max(0, Number(data.children) || 0)
      if (adults + children < 1) throw new Error('Informe pelo menos 1 pessoa')
      const list = read(KEYS.rsvps(partyId), [])
      const rsvp = {
        id: uid(),
        partyId,
        name: String(data.name || '').trim(),
        adults,
        children,
        guests: Array.isArray(data.guests) ? data.guests : [],
        message: String(data.message || '').trim(),
        createdAt: now(),
      }
      list.push(rsvp)
      write(KEYS.rsvps(partyId), list)
      emit('rsvp', partyId)
      return rsvp
    },
    async deleteRsvp(partyId, rsvpId) {
      write(
        KEYS.rsvps(partyId),
        read(KEYS.rsvps(partyId), []).filter((r) => r.id !== rsvpId)
      )
      emit('rsvp', partyId)
    },

    /** Lista privada do cliente (link com token) */
    async getClientList(token) {
      const party = read(KEYS.parties, []).find((p) => p.clientToken === token)
      if (!party) return null
      const b = getBuffet()
      return { party, buffet: { handle: b?.handle, name: b?.name }, rsvps: await api.listRsvps(party.id) }
    },

    /** Inscreve-se em mudanças (mesma aba + outras abas). Retorna função de cancelamento. */
    subscribe(callback) {
      const onLocal = (e) => callback(e.detail)
      const onStorage = (e) => {
        if (!e.key || !e.key.startsWith(NS)) return
        if (e.key.startsWith(`${NS}:rsvps:`)) return callback({ type: 'rsvp', partyId: e.key.split(':').pop() })
        const type = e.key.endsWith(':themes')
          ? 'theme'
          : e.key.endsWith(':buffet')
            ? 'settings'
            : e.key.endsWith(':session') || e.key.endsWith(':requests')
              ? 'account'
              : 'party'
        if (type === 'account' && e.key.endsWith(':session')) bus.dispatchEvent(new CustomEvent('auth'))
        callback({ type })
      }
      const onVisible = () => document.visibilityState === 'visible' && callback({ type: 'poll' })
      bus.addEventListener('change', onLocal)
      window.addEventListener('storage', onStorage)
      document.addEventListener('visibilitychange', onVisible)
      return () => {
        bus.removeEventListener('change', onLocal)
        window.removeEventListener('storage', onStorage)
        document.removeEventListener('visibilitychange', onVisible)
      }
    },
  }
  return api
}
